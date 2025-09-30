import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/database';
import { hostAwayService, type HostAwayReservation, type HostAwayCustomField } from './hostaway.service';
import { ubyPortService } from './ubyport.service';
import { VirtualKeyService } from './virtual-key.service';
import { nukiApiService } from './nuki-api.service';
import { ensureNukiKeysForBooking } from './auto-key.service';
import { getNukiPropertyMapping, formatRoomAlias } from '@/utils/nuki-properties-mapping';

interface BookingData {
  id: string;
  hostAwayId: string;
  propertyName: string;
  guestLeaderName: string;
  guestLeaderEmail: string;
  guestLeaderPhone?: string;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfGuests: number;
  roomNumber?: string;
  checkInToken: string;
  status: 'PENDING' | 'CHECKED_IN' | 'PAYMENT_PENDING' | 'PAYMENT_COMPLETED' | 'KEYS_DISTRIBUTED' | 'COMPLETED';
}

type BookingUpdateData = {
  updatedAt: Date;
  propertyName?: string;
  guestLeaderName?: string;
  guestLeaderEmail?: string;
  guestLeaderPhone?: string | null;
  checkInDate?: Date;
  checkOutDate?: Date;
  numberOfGuests?: number;
  roomNumber?: string | null;
  status?: BookingData['status'];
};

const PRAGUE_TIMEZONE = 'Europe/Prague';

const canonicalizePragueAddress = (value?: string | null): string | null => {
  if (!value) {
    return value ?? null;
  }

  const normalized = value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

  if (normalized.includes('prokopova')) {
    return 'Prokopova 197/9, 130 00 Praha 3-Žižkov';
  }

  return value;
};

const resolvePropertyIdentity = (
  listingMapId: number | null | undefined,
  fallbackName?: string | null,
  fallbackAddress?: string | null
) => {
  if (listingMapId !== null && listingMapId !== undefined) {
    const mapping = getNukiPropertyMapping(listingMapId);
    if (mapping) {
      const alias = mapping.roomCode ? formatRoomAlias(mapping.roomCode) : mapping.name;
      const roomLabel = mapping.roomCode
        ? formatRoomAlias(mapping.roomCode)
        : canonicalizePragueAddress(mapping.address) ?? mapping.address ?? alias;

      return {
        propertyName: alias ?? fallbackName ?? `Property ${listingMapId}`,
        roomNumber: roomLabel ?? fallbackAddress ?? alias ?? fallbackName ?? null,
      };
    }
  }

  return {
    propertyName: fallbackName ?? fallbackAddress ?? 'Unknown Property',
    roomNumber: fallbackAddress ?? fallbackName ?? null,
  };
};

const pad = (value: number) => value.toString().padStart(2, '0');

const getPragueOffset = (date: Date): string => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PRAGUE_TIMEZONE,
    hour12: false,
    timeZoneName: 'short'
  });

  const tzName = formatter
    .formatToParts(date)
    .find(part => part.type === 'timeZoneName')?.value ?? 'GMT+00';

  const match = tzName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/i);

  if (!match) {
    return '+00:00';
  }

  const sign = match[1] ?? '+';
  const hours = pad(Number.parseInt(match[2] ?? '0', 10));
  const minutes = pad(Number.parseInt(match[3] ?? '0', 10));

  return `${sign}${hours}:${minutes}`;
};

const toPragueDate = (input: string | Date, hours: number, minutes: number): Date => {
  const baseDate = new Date(input);
  if (Number.isNaN(baseDate.getTime())) {
    return baseDate;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PRAGUE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(baseDate);
  const year = parts.find(part => part.type === 'year')?.value ?? '1970';
  const month = parts.find(part => part.type === 'month')?.value ?? '01';
  const day = parts.find(part => part.type === 'day')?.value ?? '01';
  const offset = getPragueOffset(baseDate);

  return new Date(`${year}-${month}-${day}T${pad(hours)}:${pad(minutes)}:00${offset}`);
};

class BookingService {
  
  /**
   * Generate a unique check-in token for a booking
   */
  private async generateCheckInToken(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
      const existing = await prisma.booking.findUnique({
        where: { checkInToken: candidate }
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new Error('Unable to generate a unique check-in token after multiple attempts');
  }

  /**
   * Auto-generate Nuki keys when check-in is within the lead time window
   */
  private async ensureKeysWithinLeadTime(bookingId: string, checkInDate?: Date | null): Promise<void> {
    if (!checkInDate) {
      return;
    }

    const now = new Date();
    const leadTimeMs = 3 * 24 * 60 * 60 * 1000;
    const delta = checkInDate.getTime() - now.getTime();

    if (delta > leadTimeMs || delta < -leadTimeMs) {
      return;
    }

    try {
      console.log(`🔑 [AUTO KEYS] Ensuring keys for booking ${bookingId} (check-in ${checkInDate.toISOString()})`);
      const result = await ensureNukiKeysForBooking(bookingId, { force: true });

      if (result.status === 'created') {
        console.log(`✅ [AUTO KEYS] Generated keys for booking ${bookingId}`);
      } else if (result.status === 'already') {
        console.log(`ℹ️ [AUTO KEYS] Keys already exist for booking ${bookingId}`);
      } else if (result.status === 'skipped') {
        console.log(`ℹ️ [AUTO KEYS] Skipped booking ${bookingId}: ${result.reason}`);
      } else if (result.status === 'failed') {
        console.error(`❌ [AUTO KEYS] Failed to generate keys for booking ${bookingId}: ${result.reason}${result.error ? ` - ${result.error}` : ''}`);
      }
    } catch (error) {
      console.error(`❌ [AUTO KEYS] Unexpected error generating keys for booking ${bookingId}:`, error);
    }
  }

  /**
   * Extract existing check-in status from HostAway custom fields
   * Maps checkin.io status to our platform status
   */
  private extractCheckInStatusFromCustomFields(reservation: HostAwayReservation): {
    status: 'PENDING' | 'CHECKED_IN' | 'PAYMENT_PENDING' | 'PAYMENT_COMPLETED' | 'KEYS_DISTRIBUTED' | 'COMPLETED';
    hasExistingCheckInLink: boolean;
    existingCheckInUrl?: string;
  } {
    const customFields: HostAwayCustomField[] = reservation.customFieldValues || [];

    // Look for existing check-in status (field ID 60179)
    const statusField = customFields.find((field) => field.customFieldId === 60179);
    const checkInStatus = statusField?.value;

    // Look for existing check-in URL (field ID 60175)
    const urlField = customFields.find((field) => field.customFieldId === 60175);
    const existingCheckInUrl = urlField?.value;
    
    console.log(`🔍 [CHECK-IN STATUS] Reservation ${reservation.id} - Status: ${checkInStatus}, Has URL: ${!!existingCheckInUrl}`);
    
    // Map checkin.io status to our platform status
    let status: 'PENDING' | 'CHECKED_IN' | 'PAYMENT_PENDING' | 'PAYMENT_COMPLETED' | 'KEYS_DISTRIBUTED' | 'COMPLETED' = 'PENDING';
    
    if (checkInStatus === 'GUESTS_REGISTERED') {
      // Guest has completed check-in with checkin.io
      status = 'CHECKED_IN';
      console.log(`✅ [CHECK-IN STATUS] Reservation ${reservation.id} has completed check-in via existing system`);
    } else if (checkInStatus === 'MISSING_GUESTS') {
      // Guest has not completed check-in yet
      status = 'PENDING';
      console.log(`⏳ [CHECK-IN STATUS] Reservation ${reservation.id} check-in still pending`);
    } else if (existingCheckInUrl && !checkInStatus) {
      // Has check-in link but no status - assume pending
      status = 'PENDING';
      console.log(`🔗 [CHECK-IN STATUS] Reservation ${reservation.id} has check-in link but no status - assuming pending`);
    }
    
    return {
      status,
      hasExistingCheckInLink: !!existingCheckInUrl,
      existingCheckInUrl
    };
  }

  /**
   * Update HostAway with check-in link for NEW reservations only
   */
  private async updateHostAwayCheckInLinkForNewBooking(reservationId: number, checkInToken: string): Promise<void> {
    try {
      // Use the production Nick & Jenny domain
      const baseUrl = 'https://www.nickandjenny.cz';
      const checkInLink = `${baseUrl}/checkin/${checkInToken}`;
      
      console.log(`🔗 Updating HostAway NEW reservation ${reservationId} with Nick Jenny check-in link: ${checkInLink}`);
      
      const result = await hostAwayService.updateNickJennyCheckInLink(reservationId, checkInLink);
      
      if (result.success) {
        console.log(`✅ Successfully updated Nick Jenny check-in link for NEW HostAway reservation ${reservationId}`);
      } else {
        console.error(`❌ Failed to update Nick Jenny check-in link for NEW HostAway reservation ${reservationId}:`, result.error);
      }
    } catch (error) {
      console.error(`❌ Error updating Nick Jenny check-in link for NEW HostAway reservation ${reservationId}:`, error);
    }
  }

  /**
   * Prepare UbyPort export data when guest completes check-in (but don't submit yet)
   */
  private async prepareUbyPortExportOnCheckIn(bookingId: string): Promise<void> {
    try {
      // Check if UbyPort credentials are configured
      const credentials = {
        username: process.env.UBYPORT_USERNAME || '',
        password: process.env.UBYPORT_PASSWORD || ''
      };

      if (!credentials.username || !credentials.password) {
        console.log(`⚠️  UbyPort credentials not configured - skipping export preparation for booking ${bookingId}`);
        return;
      }

      console.log(`📋 Preparing UbyPort export data for booking ${bookingId} (will submit on check-in night)...`);
      
      // Only prepare export data - actual submission happens on check-in night via cron
      const exportResult = await ubyPortService.createExportData(bookingId);
      
      if (exportResult.success && exportResult.data) {
        // Save as EXPORTED (ready to submit on check-in night)
        const saveResult = await ubyPortService.saveExportData(bookingId, exportResult.data, 'EXPORTED');
        
        if (saveResult.success) {
          console.log(`✅ UbyPort export data prepared for booking ${bookingId} - will submit to Czech Police on check-in night`);
        } else {
          console.error(`❌ Failed to save UbyPort export data for booking ${bookingId}: ${saveResult.error}`);
        }
      } else {
        console.error(`❌ Failed to prepare UbyPort export data for booking ${bookingId}: ${exportResult.error}`);
      }
      
    } catch (error) {
      console.error(`❌ Error preparing UbyPort export for booking ${bookingId}:`, error);
    }
  }

  /**
   * Clear all existing bookings from database (use with caution!)
   */
  async clearAllBookings(): Promise<{
    success: boolean;
    deletedCount: number;
    message: string;
  }> {
    try {
      console.log('🗑️  CLEARING ALL BOOKINGS FROM DATABASE...');
      
      // Delete all related data first (cascade should handle this, but let's be explicit)
      await prisma.guest.deleteMany();
      await prisma.payment.deleteMany();
      await prisma.virtualKey.deleteMany();
      
      // Now delete all bookings
      const deleteResult = await prisma.booking.deleteMany();
      
      console.log(`🗑️  Deleted ${deleteResult.count} bookings and all related data`);
      
      return {
        success: true,
        deletedCount: deleteResult.count,
        message: `Successfully cleared ${deleteResult.count} bookings from database`
      };
    } catch (error) {
      console.error('❌ Failed to clear bookings:', error);
      return {
        success: false,
        deletedCount: 0,
        message: `Failed to clear bookings: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Sync bookings from HostAway with smart incremental strategy
   * - Initial sync: Last 7 days + ALL upcoming bookings
   * - Subsequent syncs: Only future bookings (today onwards)
   * - Never deletes existing bookings unless clearFirst is true
   * - Can optionally clear database first for fresh import
   */
  async syncBookingsFromHostAway(options?: { 
    clearFirst?: boolean;
    forceFullSync?: boolean;
    importAll?: boolean; // Import ALL historical bookings (no date restrictions)
    dateFrom?: string; // YYYY-MM-DD
    dateTo?: string;   // YYYY-MM-DD
  }): Promise<{
    success: boolean;
    newBookings: number;
    updatedBookings: number;
    totalBookings: number;
    message: string;
    isInitialSync: boolean;
    clearResult?: { deletedCount: number };
  }> {
    try {
      console.log('🔄 Starting smart HostAway booking sync...');

      // Clear database first if requested
      let clearResult: { deletedCount: number } | undefined;
      if (options?.clearFirst) {
        const result = await this.clearAllBookings();
        if (!result.success) {
          throw new Error(result.message);
        }
        clearResult = { deletedCount: result.deletedCount };
        console.log(`🗑️  Database cleared: ${result.deletedCount} bookings removed`);
      }

      // Check if this is initial sync or subsequent sync
      const existingBookingsCount = await prisma.booking.count();
      const isInitialSync = existingBookingsCount === 0 || options?.clearFirst || options?.forceFullSync;

      // Determine date window
      let dateFrom = options?.dateFrom || '';
      const dateTo = options?.dateTo || '';
      
      if (options?.importAll) {
        // Import ALL historical bookings - no date restrictions
        dateFrom = '';
        console.log('📅 FULL HISTORICAL IMPORT: No date restrictions - importing ALL bookings');
      } else if (!dateFrom) {
        // Fallback behavior: initial last 7 days + future, incremental from today
        const pastDate = new Date();
        if (isInitialSync) {
          pastDate.setDate(pastDate.getDate() - 7);
        } else {
          pastDate.setHours(0, 0, 0, 0);
        }
        dateFrom = pastDate.toISOString().split('T')[0];
      }
      
      console.log(`📅 ${isInitialSync ? 'Initial' : 'Incremental'} sync: Fetching from ${dateFrom} ${dateTo ? 'to ' + dateTo : 'to future'}${options?.dateFrom ? ' (custom dates)' : ''}`);

      // Fetch ALL bookings using pagination
      console.log('🔍 Starting paginated fetch for all bookings from:', dateFrom);
      
      const hostawayListings = await hostAwayService.getListings();
      let allReservations: HostAwayReservation[] = [];
      let offset = 0;
      const limit = 500;
      let hasMorePages = true;
      let totalAvailable = 0;
      
      while (hasMorePages) {
        // Safety check to prevent infinite loops
        if (offset > 50000) { // Reasonable upper limit
          console.log('🛑 Safety limit reached - stopping pagination at offset 50,000');
          break;
        }
        
        const fetchParams: { checkInDateFrom?: string; limit: number; offset: number; checkInDateTo?: string } = {
          limit: limit,
          offset: offset,
          ...(dateFrom ? { checkInDateFrom: dateFrom } : {}),
          ...(dateTo ? { checkInDateTo: dateTo } : {})
        };

        console.log(`🔍 Fetching page ${Math.floor(offset / limit) + 1} with params:`, fetchParams);
        
        const response = await hostAwayService.getReservations(fetchParams);
        
        // Handle both old and new response formats for backward compatibility
        let pageReservations: HostAwayReservation[] = [];
        let responseCount = 0;
        
        if (Array.isArray(response)) {
          // Old format - just array of reservations
          pageReservations = response;
          responseCount = response.length;
        } else {
          // New format - object with data and metadata
          pageReservations = response.data;
          responseCount = response.data.length;
          totalAvailable = response.totalCount;
          console.log(`📊 Progress: ${offset + responseCount}/${totalAvailable} total available reservations`);
        }
        
        if (pageReservations.length === 0) {
          hasMorePages = false;
          console.log('✅ No more reservations found, pagination complete');
        } else {
          allReservations = allReservations.concat(pageReservations);
          offset += limit;
          
          // Use total count if available, otherwise fall back to page size logic
          if (totalAvailable > 0) {
            hasMorePages = offset < totalAvailable;
            if (!hasMorePages) {
              console.log(`✅ All ${totalAvailable} reservations fetched`);
            }
          } else {
            // Fallback: If we got fewer results than the limit, we're on the last page
            if (pageReservations.length < limit) {
              hasMorePages = false;
              console.log(`✅ Last page reached with ${pageReservations.length} reservations`);
            } else {
              console.log(`📄 Page complete: ${pageReservations.length} reservations, continuing...`);
            }
          }
        }
      }
      
      console.log(`📊 Pagination complete: Total ${allReservations.length} reservations fetched${totalAvailable > 0 ? ` out of ${totalAvailable} available` : ''}`);
      
      // Apply safety filter based on requested/custom range (skip if importing all)
      let hostawayReservations = allReservations;
      if (!options?.importAll && dateFrom) {
        const thresholdDate = new Date(dateFrom);
        const endDate = dateTo ? new Date(dateTo) : null;
        hostawayReservations = allReservations.filter(r => {
          const arrival = new Date(r.arrivalDate);
          if (isNaN(arrival.getTime())) return false;
          if (endDate) {
            return arrival >= thresholdDate && arrival <= endDate;
          }
          return arrival >= thresholdDate;
        });
        console.log(`📊 After threshold filter (${thresholdDate.toISOString().split('T')[0]}${endDate ? ' to ' + endDate.toISOString().split('T')[0] : ' +'}), ${hostawayReservations.length} reservations will be processed`);
      } else {
        console.log(`📊 No filtering applied - processing all ${hostawayReservations.length} reservations`);
      }
      
      // Summary of fetch results
      if (totalAvailable > 0 && allReservations.length < totalAvailable) {
        console.log(`⚠️  WARNING: Only fetched ${allReservations.length} out of ${totalAvailable} total reservations available in HostAway`);
        console.log(`🔍 This might indicate pagination issues or API limits`);
      } else if (totalAvailable > 0) {
        console.log(`✅ Successfully fetched ALL ${totalAvailable} reservations from HostAway`);
      }

      console.log(`📊 HostAway API Results:`);
      console.log(`  - Reservations: ${hostawayReservations.length}`);
      console.log(`  - Listings: ${hostawayListings.length}`);
      console.log(`  - Sync type: ${isInitialSync ? 'Initial' : 'Incremental'}`);
      
      if (hostawayReservations.length === 0) {
        console.log('⚠️  No reservations returned from HostAway API');
        console.log('🔍 Debug info:', {
          dateFrom,
          limit,
          accountId: process.env.HOSTAWAY_ACCOUNT_ID?.substring(0, 6) + '...',
          apiKeyLength: process.env.HOSTAWAY_API_KEY?.length
        });
      }

      let newBookings = 0;
      let updatedBookings = 0;

      // Process each reservation
      for (const reservation of hostawayReservations) {
        try {
          console.log(`🔍 Processing reservation ${reservation.id}:`, {
            arrivalDate: reservation.arrivalDate,
            departureDate: reservation.departureDate,
            guestName: `${reservation.guestFirstName} ${reservation.guestLastName}`,
            guestEmail: reservation.guestEmail,
            phone: reservation.phone,
            listingMapId: reservation.listingMapId,
            listingName: reservation.listingName
          });

          if (!this.isReservationStatusEligible(reservation)) {
            console.log(`⏭️  Skipping reservation ${reservation.id} due to status ${reservation.status}`);
            continue;
          }

          // Validate dates before processing
          if (!reservation.arrivalDate || !reservation.departureDate) {
            console.log(`⚠️  Skipping reservation ${reservation.id}: Missing dates`);
            continue;
          }

          const checkInDate = toPragueDate(reservation.arrivalDate, 15, 0);
          const checkOutDate = toPragueDate(reservation.departureDate, 10, 0);

          if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
            console.log(`⚠️  Skipping reservation ${reservation.id}: Invalid dates`, {
              arrivalDate: reservation.arrivalDate,
              departureDate: reservation.departureDate
            });
            continue;
          }

          // Find the corresponding listing using listingMapId (for address info)
          const listing = hostawayListings.find(l => l.id === reservation.listingMapId);

          const hostawayStatus = reservation.status?.toLowerCase?.() ?? '';
          const isCancelled = hostawayStatus === 'cancelled' || hostawayStatus === 'canceled';
          
          // Check if booking already exists in our database
          const existingBooking = await prisma.booking.findUnique({
            where: { hostAwayId: reservation.id.toString() }
          });

          // Extract existing check-in status from HostAway custom fields
          const checkInInfo = this.extractCheckInStatusFromCustomFields(reservation);
          
          const checkInToken = existingBooking?.checkInToken ?? await this.generateCheckInToken();

          const canonicalAddress = canonicalizePragueAddress(listing?.address);
          const identity = resolvePropertyIdentity(
            reservation.listingMapId,
            reservation.listingName || listing?.name || `Property ${reservation.listingMapId}`,
            canonicalAddress
          );

          const bookingData = {
            hostAwayId: reservation.id.toString(),
            propertyName: identity.propertyName,
            guestLeaderName: reservation.guestName || `${reservation.guestFirstName || ''} ${reservation.guestLastName || ''}`.trim() || 'Guest Name Not Available',
            guestLeaderEmail: reservation.guestEmail || 'noemail@example.com',
            guestLeaderPhone: reservation.phone || null,
            checkInDate,
            checkOutDate,
            numberOfGuests: reservation.numberOfGuests || reservation.adults || 1,
            roomNumber: identity.roomNumber ?? canonicalAddress,
            checkInToken,
            // Use existing check-in status for new bookings, preserve existing status for updates
            // This handles the seamless transition from checkin.io
            status: isCancelled ? 'CANCELLED' : existingBooking?.status || checkInInfo.status
          };

          if (existingBooking) {
            console.log(`🔍 [SYNC DEBUG] Found existing booking: ${existingBooking.id}`);

            if (isCancelled && existingBooking.status !== 'CANCELLED') {
              await prisma.booking.update({
                where: { id: existingBooking.id },
                data: {
                  status: 'CANCELLED',
                  updatedAt: new Date()
                }
              });

              updatedBookings += 1;

              const activeKeys = await prisma.virtualKey.findMany({
                where: { bookingId: existingBooking.id, isActive: true }
              });

              if (activeKeys.length > 0) {
                try {
                  await nukiApiService.revokeAllKeysForBooking(activeKeys.map(key => key.nukiKeyId));
                } catch (revokeError) {
                  console.error('Failed to revoke Nuki keys for cancelled booking', existingBooking.id, revokeError);
                }

                await VirtualKeyService.deactivateAllKeysForBooking(existingBooking.id);
              }

              continue;
            }
            // Update existing booking only if HostAway data has changed
            // CRITICAL: Never overwrite our platform's advanced status (PAYMENT_COMPLETED, KEYS_DISTRIBUTED, etc.)
            // BUT allow upgrading from PENDING to CHECKED_IN when guest completes checkin.io
            const hasHostAwayChanges = (
              existingBooking.propertyName !== bookingData.propertyName ||
              existingBooking.guestLeaderName !== bookingData.guestLeaderName ||
              existingBooking.checkInDate.getTime() !== bookingData.checkInDate.getTime() ||
              existingBooking.checkOutDate.getTime() !== bookingData.checkOutDate.getTime() ||
              existingBooking.numberOfGuests !== bookingData.numberOfGuests ||
              existingBooking.guestLeaderEmail !== bookingData.guestLeaderEmail ||
              existingBooking.guestLeaderPhone !== bookingData.guestLeaderPhone
            );
            
            // Allow status transition from PENDING to CHECKED_IN when guest completes external check-in
            const shouldUpdateStatus = (
              checkInInfo.status === 'CHECKED_IN' && 
              existingBooking.status === 'PENDING' &&
              checkInInfo.hasExistingCheckInLink
            );

            if (hasHostAwayChanges || shouldUpdateStatus) {
              console.log(`🔍 [SYNC DEBUG] Updating booking ${existingBooking.id} with ${hasHostAwayChanges ? 'HostAway data' : ''}${hasHostAwayChanges && shouldUpdateStatus ? ' and ' : ''}${shouldUpdateStatus ? 'check-in status' : ''}`);
              
              const updateData: BookingUpdateData = {
                updatedAt: new Date()
              };
              
              // Update HostAway data if changed
              if (hasHostAwayChanges) {
                Object.assign(updateData, {
                  propertyName: bookingData.propertyName,
                  guestLeaderName: bookingData.guestLeaderName,
                  guestLeaderEmail: bookingData.guestLeaderEmail,
                  guestLeaderPhone: bookingData.guestLeaderPhone,
                  checkInDate: bookingData.checkInDate,
                  checkOutDate: bookingData.checkOutDate,
                  numberOfGuests: bookingData.numberOfGuests,
                  roomNumber: bookingData.roomNumber
                });
              }
              
              // Update status if guest completed check-in externally
              if (shouldUpdateStatus) {
                updateData.status = 'CHECKED_IN';
                console.log(`✅ [CHECK-IN STATUS] Upgrading booking ${existingBooking.id} from PENDING to CHECKED_IN (external system completion)`);
              }
              
              const updatedBooking = await prisma.booking.update({
                where: { id: existingBooking.id },
                data: updateData
              });
              updatedBookings++;
              console.log(`📝 [SYNC DEBUG] Updated booking: ${updatedBooking.id} - ${bookingData.guestLeaderName} - Status: ${updatedBooking.status}`);
              
              // Prepare UbyPort export data if status changed to CHECKED_IN (submit on check-in night)
              if (shouldUpdateStatus && updateData.status === 'CHECKED_IN') {
                await this.prepareUbyPortExportOnCheckIn(updatedBooking.id);
              }
              
              // Skip HostAway check-in link update to prevent email flooding
            } else {
              console.log(`🔍 [SYNC DEBUG] No changes for booking ${existingBooking.id}, skipping update`);
            }
          } else {
            console.log(`🔍 [SYNC DEBUG] Creating new booking for reservation ${reservation.id}`);
            // Create new booking with appropriate status based on existing check-in
            const newBooking = await prisma.booking.create({
              data: {
                id: `BK_${reservation.id}`,
                ...bookingData
              }
            });
            newBookings++;
            console.log(`➕ [SYNC DEBUG] Created new booking: ${newBooking.id} - ${bookingData.guestLeaderName} - Status: ${newBooking.status} ${checkInInfo.hasExistingCheckInLink ? '(has existing check-in)' : ''}`);
            
            // Only add Nick Jenny check-in link if guest hasn't already completed check-in with existing system
            if (!isCancelled && (!checkInInfo.hasExistingCheckInLink || checkInInfo.status === 'PENDING')) {
              console.log(`🔗 [NEW BOOKING] Adding Nick Jenny check-in link for reservation ${reservation.id}`);
              await this.updateHostAwayCheckInLinkForNewBooking(reservation.id, newBooking.checkInToken);
            } else {
              console.log(`✅ [NEW BOOKING] Reservation ${reservation.id} already completed check-in externally - skipping Nick Jenny link addition`);
            }

            if (!isCancelled) {
              await this.ensureKeysWithinLeadTime(newBooking.id, newBooking.checkInDate);
            }

            // Verify the booking was created
            const verifyBooking = await prisma.booking.findUnique({
              where: { id: newBooking.id }
            });
            console.log(`🔍 [SYNC DEBUG] Verification - booking exists after creation:`, !!verifyBooking);
          }
        } catch (error) {
          console.error(`❌ Error processing reservation ${reservation.id}:`, error);
          // Continue with other reservations
        }
      }

      // Update last sync timestamp
      await this.updateLastSyncTime();

      // Get total bookings count
      const totalBookings = await prisma.booking.count();

      const result = {
        success: true,
        newBookings,
        updatedBookings,
        totalBookings,
        isInitialSync: isInitialSync as boolean,
        clearResult,
        message: `${isInitialSync ? 'Initial' : 'Incremental'} sync completed: ${newBookings} new, ${updatedBookings} updated, ${totalBookings} total bookings${clearResult ? `, cleared ${clearResult.deletedCount} old bookings` : ''}`
      };

      console.log('✅ Booking sync completed:', result);
      return result;

    } catch (error) {
      console.error('❌ Booking sync failed:', error);
      return {
        success: false,
        newBookings: 0,
        updatedBookings: 0,
        totalBookings: 0,
        isInitialSync: false,
        clearResult: undefined,
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get all bookings from database with optional filtering
   */
  async getBookings(filters?: {
    status?: string;
    checkInDateFrom?: Date;
    checkInDateTo?: Date;
    limit?: number;
  }) {
    try {
      console.log('📋 [SERVICE DEBUG] getBookings called with filters:', filters);
      
      const where: Record<string, unknown> = {};

      if (filters?.status) {
        where.status = filters.status;
        console.log('📋 [SERVICE DEBUG] Added status filter:', filters.status);
      }

      if (filters?.checkInDateFrom || filters?.checkInDateTo) {
        const dateFilter: { gte?: Date; lte?: Date } = {};
        if (filters.checkInDateFrom) {
          dateFilter.gte = filters.checkInDateFrom;
        }
        if (filters.checkInDateTo) {
          dateFilter.lte = filters.checkInDateTo;
        }
        where.checkInDate = dateFilter;
        console.log('📋 [SERVICE DEBUG] Added date filter:', dateFilter);
      }

      console.log('📋 [SERVICE DEBUG] Final where clause:', where);
      console.log('📋 [SERVICE DEBUG] Limit:', filters?.limit || 100);
      
      console.log('📋 [SERVICE DEBUG] Executing prisma.booking.findMany...');
      const bookings = await prisma.booking.findMany({
        where,
        orderBy: { checkInDate: 'asc' },
        // Only apply limit if explicitly provided, otherwise get ALL bookings
        ...(filters?.limit ? { take: filters.limit } : {})
      });

      console.log(`📋 [SERVICE DEBUG] prisma.booking.findMany returned ${bookings.length} bookings`);
      if (bookings.length > 0) {
        console.log('📋 [SERVICE DEBUG] Sample booking:', {
          id: bookings[0].id,
          hostAwayId: bookings[0].hostAwayId,
          propertyName: bookings[0].propertyName,
          guestName: bookings[0].guestLeaderName,
          checkInDate: bookings[0].checkInDate
        });
      }

      return bookings;
    } catch (error) {
      console.error('❌ [SERVICE DEBUG] Error fetching bookings:', error);
      console.error('❌ [SERVICE DEBUG] Error details:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ [SERVICE DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack');
      return [];
    }
  }

  /**
   * Determine if a HostAway reservation status represents an actionable booking
   */
  private isReservationStatusEligible(reservation: HostAwayReservation): boolean {
    const status = reservation.status?.toLowerCase();
    if (!status) {
      return true;
    }

    if (status.startsWith('inquiry')) {
      return false;
    }

    return true;
  }

  /**
   * Get booking by check-in token
   */
  async getBookingByToken(token: string) {
    try {
      return await prisma.booking.findUnique({
        where: { checkInToken: token }
      });
    } catch (error) {
      console.error('Error fetching booking by token:', error);
      return null;
    }
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(bookingId: string, status: BookingData['status']) {
    try {
      return await prisma.booking.update({
        where: { id: bookingId },
        data: { status }
      });
    } catch (error) {
      console.error('Error updating booking status:', error);
      return null;
    }
  }

  /**
   * Get last sync timestamp from a simple key-value store or database
   */
  private async getLastSyncTime(): Promise<Date | null> {
    // For now, we'll use a simple approach
    // In production, you might want to store this in a separate sync_log table
    try {
      // We could store this as a setting in the database or use file system
      // For simplicity, let's return null for now (always do full sync)
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Update last sync timestamp
   */
  private async updateLastSyncTime(): Promise<void> {
    try {
      // For now, we'll skip this
      // In production, you might want to store this in a sync_log table
      console.log('📝 Last sync time updated to:', new Date().toISOString());
    } catch (error) {
      console.error('Error updating last sync time:', error);
    }
  }

  /**
   * Sync a specific reservation from webhook events
   * Uses the same logic as the main sync but for a single reservation
   */
  async syncSpecificReservation(reservation: HostAwayReservation): Promise<{
    success: boolean;
    message: string;
    bookingId?: string;
    action?: 'created' | 'updated' | 'skipped';
  }> {
    try {
      console.log(`🔄 [SINGLE SYNC] Processing reservation ${reservation.id}`);

      // Validate required fields
      if (!reservation.arrivalDate || !reservation.departureDate) {
        console.log(`⚠️  Skipping reservation ${reservation.id}: Missing dates`);
        return {
          success: false,
          message: `Reservation ${reservation.id} missing arrival or departure date`
        };
      }

      const checkInDate = toPragueDate(reservation.arrivalDate, 15, 0);
      const checkOutDate = toPragueDate(reservation.departureDate, 10, 0);

      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        console.log(`⚠️  Skipping reservation ${reservation.id}: Invalid dates`);
        return {
          success: false,
          message: `Reservation ${reservation.id} has invalid dates`
        };
      }

      if (!this.isReservationStatusEligible(reservation)) {
        console.log(`⏭️  [SINGLE SYNC] Skipping reservation ${reservation.id} due to status ${reservation.status}`);
        return {
          success: false,
          message: `Reservation ${reservation.id} skipped due to status ${reservation.status}`
        };
      }

      // Get listings for property name lookup
      const listings = await hostAwayService.getListings();
      const listing = listings.find(l => l.id === reservation.listingMapId);

      // Check if booking already exists
      const existingBooking = await prisma.booking.findUnique({
        where: { hostAwayId: reservation.id.toString() }
      });

      // Extract existing check-in status from HostAway custom fields
      const checkInInfo = this.extractCheckInStatusFromCustomFields(reservation);
      
      const checkInToken = existingBooking?.checkInToken ?? await this.generateCheckInToken();

      const hostawayStatus = reservation.status?.toLowerCase?.() ?? '';
      const isCancelled = hostawayStatus === 'cancelled' || hostawayStatus === 'canceled';

      const canonicalAddress = canonicalizePragueAddress(listing?.address);
      const identity = resolvePropertyIdentity(
        reservation.listingMapId,
        reservation.listingName || listing?.name || `Property ${reservation.listingMapId}`,
        canonicalAddress
      );

      const bookingData = {
        hostAwayId: reservation.id.toString(),
        propertyName: identity.propertyName,
        guestLeaderName: reservation.guestName || `${reservation.guestFirstName || ''} ${reservation.guestLastName || ''}`.trim() || 'Guest Name Not Available',
        guestLeaderEmail: reservation.guestEmail || 'noemail@example.com',
        guestLeaderPhone: reservation.phone || null,
        checkInDate,
        checkOutDate,
        numberOfGuests: reservation.numberOfGuests || reservation.adults || 1,
        roomNumber: identity.roomNumber ?? canonicalAddress,
        checkInToken,
        // Use existing check-in status for new bookings, preserve existing status for updates
        status: isCancelled ? 'CANCELLED' : existingBooking?.status || checkInInfo.status
      };

      if (existingBooking) {
        console.log(`🔍 [SINGLE SYNC] Found existing booking: ${existingBooking.id}`);

        if (isCancelled && existingBooking.status !== 'CANCELLED') {
          await prisma.booking.update({
            where: { id: existingBooking.id },
            data: {
              status: 'CANCELLED',
              updatedAt: new Date()
            }
          });

          const activeKeys = await prisma.virtualKey.findMany({
            where: { bookingId: existingBooking.id, isActive: true }
          });

          if (activeKeys.length > 0) {
            try {
              await nukiApiService.revokeAllKeysForBooking(activeKeys.map(key => key.nukiKeyId));
            } catch (revokeError) {
              console.error('Failed to revoke Nuki keys for cancelled booking', existingBooking.id, revokeError);
            }

            await VirtualKeyService.deactivateAllKeysForBooking(existingBooking.id);
          }

          return {
            success: true,
            message: `Booking ${existingBooking.id} marked as cancelled`,
            bookingId: existingBooking.id,
            action: 'updated'
          };
        }

        if (isCancelled && existingBooking.status === 'CANCELLED') {
          return {
            success: true,
            message: `Booking ${existingBooking.id} already cancelled`,
            bookingId: existingBooking.id,
            action: 'skipped'
          };
        }

        // Check if HostAway data has changed
        const hasHostAwayChanges = (
          existingBooking.propertyName !== bookingData.propertyName ||
          existingBooking.guestLeaderName !== bookingData.guestLeaderName ||
          existingBooking.checkInDate.getTime() !== bookingData.checkInDate.getTime() ||
          existingBooking.checkOutDate.getTime() !== bookingData.checkOutDate.getTime() ||
          existingBooking.numberOfGuests !== bookingData.numberOfGuests ||
          existingBooking.guestLeaderEmail !== bookingData.guestLeaderEmail ||
          existingBooking.guestLeaderPhone !== bookingData.guestLeaderPhone
        );
        
        // Allow status transition from PENDING to CHECKED_IN when guest actually completes check-in
        const shouldUpdateStatus = (
          checkInInfo.status === 'CHECKED_IN' &&
          existingBooking.status === 'PENDING'
          // No need to check for existing check-in link - update based on actual completion
        );

        if (hasHostAwayChanges || shouldUpdateStatus) {
          console.log(`🔍 [SINGLE SYNC] Updating booking ${existingBooking.id} with ${hasHostAwayChanges ? 'HostAway data' : ''}${hasHostAwayChanges && shouldUpdateStatus ? ' and ' : ''}${shouldUpdateStatus ? 'check-in status' : ''}`);
          
          const updateData: BookingUpdateData = {
            updatedAt: new Date()
          };
          
          // Update HostAway data if changed
          if (hasHostAwayChanges) {
            Object.assign(updateData, {
              propertyName: bookingData.propertyName,
              guestLeaderName: bookingData.guestLeaderName,
              guestLeaderEmail: bookingData.guestLeaderEmail,
              guestLeaderPhone: bookingData.guestLeaderPhone,
              checkInDate: bookingData.checkInDate,
              checkOutDate: bookingData.checkOutDate,
              numberOfGuests: bookingData.numberOfGuests,
              roomNumber: bookingData.roomNumber
            });
          }
          
          // Update status if guest completed check-in externally
          if (shouldUpdateStatus) {
            updateData.status = 'CHECKED_IN';
            console.log(`✅ [SINGLE SYNC CHECK-IN] Upgrading booking ${existingBooking.id} from PENDING to CHECKED_IN (external system completion)`);
          }
          
          const updatedBooking = await prisma.booking.update({
            where: { id: existingBooking.id },
            data: updateData
          });
          
          console.log(`✅ [SINGLE SYNC] Updated booking: ${updatedBooking.id} - ${bookingData.guestLeaderName} - Status: ${updatedBooking.status}`);
          
          // Prepare UbyPort export data if status changed to CHECKED_IN (submit on check-in night)
          if (shouldUpdateStatus && updateData.status === 'CHECKED_IN') {
            await this.prepareUbyPortExportOnCheckIn(updatedBooking.id);
          }
          
          // Skip HostAway check-in link update to prevent email flooding
          
          return {
            success: true,
            message: `Updated booking ${updatedBooking.id} - Status: ${updatedBooking.status}`,
            bookingId: updatedBooking.id,
            action: 'updated'
          };
        } else {
          console.log(`🔍 [SINGLE SYNC] No changes for booking ${existingBooking.id}, skipping update`);
          return {
            success: true,
            message: `No changes for booking ${existingBooking.id}`,
            bookingId: existingBooking.id,
            action: 'skipped'
          };
        }
      } else {
        console.log(`🔍 [SINGLE SYNC] Creating new booking for reservation ${reservation.id}`);
        
        // Create new booking with appropriate status based on existing check-in
        const newBooking = await prisma.booking.create({
          data: {
            id: `BK_${reservation.id}`,
            ...bookingData
          }
        });
        
        console.log(`✅ [SINGLE SYNC] Created new booking: ${newBooking.id} - ${bookingData.guestLeaderName} - Status: ${newBooking.status} ${checkInInfo.hasExistingCheckInLink ? '(has existing check-in)' : ''}`);

        if (!isCancelled && (!checkInInfo.hasExistingCheckInLink || checkInInfo.status === 'PENDING')) {
          console.log(`🔗 [SINGLE SYNC NEW] Adding Nick Jenny check-in link for reservation ${reservation.id}`);
          await this.updateHostAwayCheckInLinkForNewBooking(reservation.id, newBooking.checkInToken);
        }

        if (!isCancelled) {
          await this.ensureKeysWithinLeadTime(newBooking.id, newBooking.checkInDate);
        }

        return {
          success: true,
          message: `Created new booking ${newBooking.id} - Status: ${newBooking.status}`,
          bookingId: newBooking.id,
          action: 'created'
        };
      }

    } catch (error) {
      console.error(`❌ [SINGLE SYNC] Error syncing reservation ${reservation.id}:`, error);
      return {
        success: false,
        message: `Failed to sync reservation ${reservation.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const bookingService = new BookingService();
