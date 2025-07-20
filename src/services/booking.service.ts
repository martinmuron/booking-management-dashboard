import { prisma } from '@/lib/database';
import { Booking, BookingStatus } from '@/types';
import { Prisma } from '@prisma/client';

export class BookingService {
  // Create a new booking from HostAway data
  static async createBooking(data: {
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
  }): Promise<Booking> {
    const booking = await prisma.booking.create({
      data,
      include: {
        guests: true,
        payments: true,
        virtualKeys: true,
      },
    });
    
    return booking as Booking;
  }

  // Get booking by ID with all relations
  static async getBookingById(id: string): Promise<Booking | null> {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        guests: true,
        payments: true,
        virtualKeys: true,
      },
    });
    
    return booking as Booking | null;
  }

  // Get booking by HostAway ID
  static async getBookingByHostAwayId(hostAwayId: string): Promise<Booking | null> {
    const booking = await prisma.booking.findUnique({
      where: { hostAwayId },
      include: {
        guests: true,
        payments: true,
        virtualKeys: true,
      },
    });
    
    return booking as Booking | null;
  }

  // Get booking by check-in token
  static async getBookingByToken(checkInToken: string): Promise<Booking | null> {
    const booking = await prisma.booking.findUnique({
      where: { checkInToken },
      include: {
        guests: true,
        payments: true,
        virtualKeys: true,
      },
    });
    
    return booking as Booking | null;
  }

  // Get all bookings with filtering
  static async getBookings(filters?: {
    status?: BookingStatus[];
    dateRange?: { from: Date; to: Date };
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ bookings: Booking[]; total: number }> {
    const where: Prisma.BookingWhereInput = {};

    if (filters?.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    if (filters?.dateRange) {
      where.checkInDate = {
        gte: filters.dateRange.from,
        lte: filters.dateRange.to,
      };
    }

    if (filters?.search) {
      where.OR = [
        { guestLeaderName: { contains: filters.search, mode: 'insensitive' } },
        { guestLeaderEmail: { contains: filters.search, mode: 'insensitive' } },
        { propertyName: { contains: filters.search, mode: 'insensitive' } },
        { hostAwayId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          guests: true,
          payments: true,
          virtualKeys: true,
        },
        orderBy: { checkInDate: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      prisma.booking.count({ where }),
    ]);

    return { bookings: bookings as Booking[], total };
  }

  // Update booking status
  static async updateBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
    const booking = await prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        guests: true,
        payments: true,
        virtualKeys: true,
      },
    });
    
    return booking as Booking;
  }

  // Check if booking exists by HostAway ID
  static async bookingExists(hostAwayId: string): Promise<boolean> {
    const count = await prisma.booking.count({
      where: { hostAwayId },
    });
    
    return count > 0;
  }

  // Get bookings requiring check-in (status PENDING)
  static async getPendingCheckIns(): Promise<Booking[]> {
    const bookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        checkInDate: {
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000), // Within next 24 hours
        },
      },
      include: {
        guests: true,
        payments: true,
        virtualKeys: true,
      },
      orderBy: { checkInDate: 'asc' },
    });
    
    return bookings as Booking[];
  }

  // Delete booking (cascade will handle related records)
  static async deleteBooking(id: string): Promise<void> {
    await prisma.booking.delete({
      where: { id },
    });
  }
}