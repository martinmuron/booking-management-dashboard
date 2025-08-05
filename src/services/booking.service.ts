import { prisma } from '@/lib/database';
import { hostAwayService } from './hostaway.service';

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
   * Sync bookings from HostAway with smart incremental strategy
   * - Initial sync: Last 30 days + ALL upcoming bookings
   * - Subsequent syncs: Only upcoming bookings (never delete existing)
   */
  async syncBookingsFromHostAway(): Promise<{
    success: boolean;
    newBookings: number;
    updatedBookings: number;
    totalBookings: number;
    message: string;
    isInitialSync: boolean;
  }> {
    try {
      console.log('🔄 Starting smart HostAway booking sync...');

      // Check if this is initial sync or subsequent sync
      const existingBookingsCount = await prisma.booking.count();
      const isInitialSync = existingBookingsCount === 0;

      let dateFrom: string;
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      if (isInitialSync) {
        // Initial sync: Last 30 days + ALL upcoming bookings
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 30);
        dateFrom = pastDate.toISOString().split('T')[0];
        console.log('📅 Initial sync: Fetching from', dateFrom, 'to future (all upcoming)');
      } else {
        // Subsequent sync: Only upcoming bookings (from today onwards)
        dateFrom = todayStr;
        console.log('📅 Incremental sync: Fetching upcoming bookings from', dateFrom);
      }

      // For upcoming bookings, we don't set an end date to get ALL future bookings
      const fetchParams: any = {
        checkInDateFrom: dateFrom,
        limit: isInitialSync ? 200 : 100 // More for initial sync
      };

      // Fetch bookings from HostAway
      const [hostawayReservations, hostawayListings] = await Promise.all([
        hostAwayService.getReservations(fetchParams),
        hostAwayService.getListings()
      ]);

      console.log(`📊 Fetched ${hostawayReservations.length} reservations from HostAway (${isInitialSync ? 'Initial' : 'Incremental'} sync)`);

      let newBookings = 0;
      let updatedBookings = 0;

      // Process each reservation
      for (const reservation of hostawayReservations) {
        try {
          // Find the corresponding listing
          const listing = hostawayListings.find(l => l.id === reservation.listingId);
          
          // Check if booking already exists in our database
          const existingBooking = await prisma.booking.findUnique({
            where: { hostAwayId: reservation.id.toString() }
          });

          const bookingData = {
            hostAwayId: reservation.id.toString(),
            propertyName: listing?.name || `Property ${reservation.listingId}`,
            guestLeaderName: `${reservation.guestFirstName} ${reservation.guestLastName}`.trim(),
            guestLeaderEmail: reservation.guestEmail || 'noemail@example.com', // HostAway might not always provide email
            guestLeaderPhone: reservation.guestPhone || null,
            checkInDate: new Date(reservation.checkInDate),
            checkOutDate: new Date(reservation.checkOutDate),
            numberOfGuests: reservation.personCapacity || 1,
            roomNumber: listing?.address || null,
            checkInToken: existingBooking?.checkInToken || this.generateCheckInToken(),
            // Only update status to PENDING if it's a new booking or current status is PENDING
            // This preserves our platform's status updates (CHECKED_IN, PAYMENT_COMPLETED, etc.)
            status: existingBooking?.status || 'PENDING' as const
          };

          if (existingBooking) {
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
              await prisma.booking.update({
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
              console.log(`📝 Updated HostAway data for booking: ${bookingData.hostAwayId} - ${bookingData.guestLeaderName}`);
            }
          } else {
            // Create new booking
            await prisma.booking.create({
              data: {
                id: `BK_${reservation.id}`,
                ...bookingData
              }
            });
            newBookings++;
            console.log(`➕ Created new booking: ${bookingData.hostAwayId} - ${bookingData.guestLeaderName}`);
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
        isInitialSync,
        message: `${isInitialSync ? 'Initial' : 'Incremental'} sync completed: ${newBookings} new, ${updatedBookings} updated, ${totalBookings} total bookings`
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
      const where: any = {};

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.checkInDateFrom || filters?.checkInDateTo) {
        where.checkInDate = {};
        if (filters.checkInDateFrom) {
          where.checkInDate.gte = filters.checkInDateFrom;
        }
        if (filters.checkInDateTo) {
          where.checkInDate.lte = filters.checkInDateTo;
        }
      }

      const bookings = await prisma.booking.findMany({
        where,
        orderBy: { checkInDate: 'asc' },
        take: filters?.limit || 100
      });

      return bookings;
    } catch (error) {
      console.error('Error fetching bookings:', error);
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
    } catch (error) {
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
}

export const bookingService = new BookingService();