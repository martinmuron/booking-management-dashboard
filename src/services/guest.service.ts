import { prisma } from '@/lib/database';
import { Guest, GuestSex } from '@/types';

export class GuestService {
  // Create multiple guests for a booking
  static async createGuests(
    bookingId: string,
    guestsData: Array<{
      firstName: string;
      lastName: string;
      birthDate: Date;
      nationality: string;
      sex: GuestSex;
      residenceCountry: string;
      email: string;
      phone?: string;
    }>
  ): Promise<Guest[]> {
    await prisma.guest.createMany({
      data: guestsData.map(guest => ({
        ...guest,
        bookingId,
      })),
    });

    // Return the created guests
    return await prisma.guest.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Get all guests for a booking
  static async getGuestsByBookingId(bookingId: string): Promise<Guest[]> {
    return await prisma.guest.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Update guest information
  static async updateGuest(
    id: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      birthDate: Date;
      nationality: string;
      sex: GuestSex;
      residenceCountry: string;
      email: string;
      phone: string;
    }>
  ): Promise<Guest> {
    return await prisma.guest.update({
      where: { id },
      data,
    });
  }

  // Delete guest
  static async deleteGuest(id: string): Promise<void> {
    await prisma.guest.delete({
      where: { id },
    });
  }

  // Get adult guests (18+) for tax calculation
  static async getAdultGuests(bookingId: string): Promise<Guest[]> {
    const guests = await prisma.guest.findMany({
      where: { bookingId },
    });

    return guests.filter(guest => {
      const age = new Date().getFullYear() - guest.birthDate.getFullYear();
      const monthDiff = new Date().getMonth() - guest.birthDate.getMonth();
      const dayDiff = new Date().getDate() - guest.birthDate.getDate();
      
      // Adjust age if birthday hasn't occurred this year
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        return age - 1 >= 18;
      }
      
      return age >= 18;
    });
  }

  // Clear all guests for a booking (useful for re-doing check-in)
  static async clearGuestsForBooking(bookingId: string): Promise<void> {
    await prisma.guest.deleteMany({
      where: { bookingId },
    });
  }

  // Get guest count by booking
  static async getGuestCount(bookingId: string): Promise<number> {
    return await prisma.guest.count({
      where: { bookingId },
    });
  }
}