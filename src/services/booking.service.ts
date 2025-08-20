import { prisma } from '@/lib/database';
import { hostAwayService, type HostAwayReservation } from './hostaway.service';

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

class BookingService {
  
  /**
   * Generate a unique check-in token for a booking
   */
  private generateCheckInToken(): string {
    return Math.random().toString(36).substring(2, 12).toUpperCase();
  }

  /**
   * Update HostAway reservation with check-in link
   */
  private async updateHostAwayCheckInLink(reservationId: number, checkInToken: string): Promise<void> {
    try {
      // Get the base URL from environment or use a default
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://localhost:3000';
      const checkInLink = `${baseUrl}/checkin/${checkInToken}`;
      
      console.log(`🔗 Updating HostAway reservation ${reservationId} with check-in link: ${checkInLink}`);
      
      const result = await hostAwayService.updateReservationCustomField(
        reservationId,
        'reservation_check_in_link_nick_jenny',
        checkInLink
      );
      
      if (result.success) {
        console.log(`✅ Successfully updated HostAway reservation ${reservationId} with check-in link`);
      } else {
        console.error(`❌ Failed to update HostAway reservation ${reservationId}: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Error updating HostAway reservation ${reservationId} with check-in link:`, error);
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

          // Validate dates before processing
          if (!reservation.arrivalDate || !reservation.departureDate) {
            console.log(`⚠️  Skipping reservation ${reservation.id}: Missing dates`);
            continue;
          }

          const checkInDate = new Date(reservation.arrivalDate);
          const checkOutDate = new Date(reservation.departureDate);

          if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
            console.log(`⚠️  Skipping reservation ${reservation.id}: Invalid dates`, {
              arrivalDate: reservation.arrivalDate,
              departureDate: reservation.departureDate
            });
            continue;
          }

          // Find the corresponding listing using listingMapId (for address info)
          const listing = hostawayListings.find(l => l.id === reservation.listingMapId);
          
          // Check if booking already exists in our database
          const existingBooking = await prisma.booking.findUnique({
            where: { hostAwayId: reservation.id.toString() }
          });

          const bookingData = {
            hostAwayId: reservation.id.toString(),
            propertyName: reservation.listingName || listing?.name || `Property ${reservation.listingMapId}`,
            guestLeaderName: reservation.guestName || `${reservation.guestFirstName || ''} ${reservation.guestLastName || ''}`.trim() || 'Guest Name Not Available',
            guestLeaderEmail: reservation.guestEmail || 'noemail@example.com',
            guestLeaderPhone: reservation.phone || null,
            checkInDate,
            checkOutDate,
            numberOfGuests: reservation.numberOfGuests || reservation.adults || 1,
            roomNumber: listing?.address || null,
            checkInToken: existingBooking?.checkInToken || this.generateCheckInToken(),
            // Only update status to PENDING if it's a new booking or current status is PENDING
            // This preserves our platform's status updates (CHECKED_IN, PAYMENT_COMPLETED, etc.)
            status: existingBooking?.status || 'PENDING' as const
          };

          if (existingBooking) {
            console.log(`🔍 [SYNC DEBUG] Found existing booking: ${existingBooking.id}`);
            // Update existing booking only if HostAway data has changed
            // CRITICAL: Never overwrite our platform's status or check-in token
            const hasHostAwayChanges = (
              existingBooking.propertyName !== bookingData.propertyName ||
              existingBooking.guestLeaderName !== bookingData.guestLeaderName ||
              existingBooking.checkInDate.getTime() !== bookingData.checkInDate.getTime() ||
              existingBooking.checkOutDate.getTime() !== bookingData.checkOutDate.getTime() ||
              existingBooking.numberOfGuests !== bookingData.numberOfGuests ||
              existingBooking.guestLeaderEmail !== bookingData.guestLeaderEmail ||
              existingBooking.guestLeaderPhone !== bookingData.guestLeaderPhone
            );

            if (hasHostAwayChanges) {
              console.log(`🔍 [SYNC DEBUG] Updating booking ${existingBooking.id} with new data`);
              const updatedBooking = await prisma.booking.update({
                where: { id: existingBooking.id },
                data: {
                  // Only update HostAway data, preserve our platform status and token
                  propertyName: bookingData.propertyName,
                  guestLeaderName: bookingData.guestLeaderName,
                  guestLeaderEmail: bookingData.guestLeaderEmail,
                  guestLeaderPhone: bookingData.guestLeaderPhone,
                  checkInDate: bookingData.checkInDate,
                  checkOutDate: bookingData.checkOutDate,
                  numberOfGuests: bookingData.numberOfGuests,
                  roomNumber: bookingData.roomNumber,
                  updatedAt: new Date()
                  // Keep existing status and checkInToken
                }
              });
              updatedBookings++;
              console.log(`📝 [SYNC DEBUG] Updated booking: ${updatedBooking.id} - ${bookingData.guestLeaderName}`);
              
              // Also update HostAway with check-in link (in case it wasn't set before)
              this.updateHostAwayCheckInLink(reservation.id, existingBooking.checkInToken).catch((error) => {
                console.error(`Failed to update HostAway check-in link for updated booking ${updatedBooking.id}:`, error);
              });
            } else {
              console.log(`🔍 [SYNC DEBUG] No changes for booking ${existingBooking.id}, skipping update`);
            }
          } else {
            console.log(`🔍 [SYNC DEBUG] Creating new booking for reservation ${reservation.id}`);
            // Create new booking
            const newBooking = await prisma.booking.create({
              data: {
                id: `BK_${reservation.id}`,
                ...bookingData
              }
            });
            newBookings++;
            console.log(`➕ [SYNC DEBUG] Created new booking: ${newBooking.id} - ${bookingData.guestLeaderName}`);
            
            // Update HostAway with check-in link (don't wait for this to complete)
            this.updateHostAwayCheckInLink(reservation.id, newBooking.checkInToken).catch((error) => {
              console.error(`Failed to update HostAway check-in link for booking ${newBooking.id}:`, error);
            });
            
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

      const checkInDate = new Date(reservation.arrivalDate);
      const checkOutDate = new Date(reservation.departureDate);

      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        console.log(`⚠️  Skipping reservation ${reservation.id}: Invalid dates`);
        return {
          success: false,
          message: `Reservation ${reservation.id} has invalid dates`
        };
      }

      // Get listings for property name lookup
      const listings = await hostAwayService.getListings();
      const listing = listings.find(l => l.id === reservation.listingMapId);

      // Check if booking already exists
      const existingBooking = await prisma.booking.findUnique({
        where: { hostAwayId: reservation.id.toString() }
      });

      const bookingData = {
        hostAwayId: reservation.id.toString(),
        propertyName: reservation.listingName || listing?.name || `Property ${reservation.listingMapId}`,
        guestLeaderName: reservation.guestName || `${reservation.guestFirstName || ''} ${reservation.guestLastName || ''}`.trim() || 'Guest Name Not Available',
        guestLeaderEmail: reservation.guestEmail || 'noemail@example.com',
        guestLeaderPhone: reservation.phone || null,
        checkInDate,
        checkOutDate,
        numberOfGuests: reservation.numberOfGuests || reservation.adults || 1,
        roomNumber: listing?.address || null,
        checkInToken: existingBooking?.checkInToken || this.generateCheckInToken(),
        // Only update status to PENDING if it's a new booking or current status is PENDING
        // This preserves our platform's status updates (CHECKED_IN, PAYMENT_COMPLETED, etc.)
        status: existingBooking?.status || 'PENDING' as const
      };

      if (existingBooking) {
        console.log(`🔍 [SINGLE SYNC] Found existing booking: ${existingBooking.id}`);
        
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

        if (hasHostAwayChanges) {
          console.log(`🔍 [SINGLE SYNC] Updating booking ${existingBooking.id} with new data`);
          const updatedBooking = await prisma.booking.update({
            where: { id: existingBooking.id },
            data: {
              // Only update HostAway data, preserve our platform status and token
              propertyName: bookingData.propertyName,
              guestLeaderName: bookingData.guestLeaderName,
              guestLeaderEmail: bookingData.guestLeaderEmail,
              guestLeaderPhone: bookingData.guestLeaderPhone,
              checkInDate: bookingData.checkInDate,
              checkOutDate: bookingData.checkOutDate,
              numberOfGuests: bookingData.numberOfGuests,
              roomNumber: bookingData.roomNumber,
              updatedAt: new Date()
              // Keep existing status and checkInToken
            }
          });
          
          console.log(`✅ [SINGLE SYNC] Updated booking: ${updatedBooking.id} - ${bookingData.guestLeaderName}`);
          
          // Also update HostAway with check-in link (in case it wasn't set before)
          this.updateHostAwayCheckInLink(reservation.id, existingBooking.checkInToken).catch((error) => {
            console.error(`Failed to update HostAway check-in link for updated booking ${updatedBooking.id}:`, error);
          });
          
          return {
            success: true,
            message: `Updated booking ${updatedBooking.id}`,
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
        
        // Create new booking
        const newBooking = await prisma.booking.create({
          data: {
            id: `BK_${reservation.id}`,
            ...bookingData
          }
        });
        
        console.log(`✅ [SINGLE SYNC] Created new booking: ${newBooking.id} - ${bookingData.guestLeaderName}`);
        
        // Update HostAway with check-in link (don't wait for this to complete)
        this.updateHostAwayCheckInLink(reservation.id, newBooking.checkInToken).catch((error) => {
          console.error(`Failed to update HostAway check-in link for booking ${newBooking.id}:`, error);
        });
        
        return {
          success: true,
          message: `Created new booking ${newBooking.id}`,
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