// Import Prisma types
import { 
  Booking as PrismaBooking, 
  Guest as PrismaGuest, 
  Payment as PrismaPayment, 
  VirtualKey as PrismaVirtualKey, 
  BookingStatus, 
  VirtualKeyType 
} from '@prisma/client';

// Core booking types (extending Prisma types)
export interface Booking extends PrismaBooking {
  guests: Guest[];
  payments: Payment[];
  virtualKeys: VirtualKey[];
}

// Use Prisma types directly
export type Guest = PrismaGuest;
export type Payment = PrismaPayment;
export type VirtualKey = PrismaVirtualKey;

// Re-export Prisma enums
export { BookingStatus, VirtualKeyType };

// HostAway API types (READ-ONLY)
export interface HostAwayBooking {
  id: string;
  propertyId: string;
  propertyName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  roomNumber?: string;
  status: string;
}

// Form types for guest check-in
export interface GuestFormData {
  firstName: string;
  lastName: string;
  birthDate: string;
  nationality: string;
  sex: 'male' | 'female' | 'other';
  residenceCountry: string;
  email: string;
  phone: string;
}

export interface CheckInFormData {
  guests: GuestFormData[];
  signature: string;
  agreedToTerms: boolean;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Filter types for admin dashboard
export interface BookingFilters {
  status?: BookingStatus[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  guestCount?: {
    min: number;
    max: number;
  };
  property?: string;
  search?: string;
}