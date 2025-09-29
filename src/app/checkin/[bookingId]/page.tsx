import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CheckinClient from './CheckinClient';
import { getCityTaxPolicy, calculateCityTaxForStay, type CityTaxGuestInput } from '@/lib/city-tax';

interface VirtualKey {
  id: string;
  keyType: string;
  nukiKeyId: string;
  isActive: boolean;
  createdAt: string;
  deactivatedAt?: string;
}

interface BookingData {
  id: string;
  propertyName: string;
  propertyAddress?: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  roomNumber?: string;
  guestLeaderName: string;
  cityTaxAmount: number;
  cityTaxPerPerson: number;
  universalKeypadCode?: string;
  status: string;
  payments: Array<{
    id: string;
    status: string;
    amount?: number | null;
    stripePaymentIntentId?: string | null;
    currency?: string | null;
  }>;
  guests: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    phoneCountryCode?: string | null;
    dateOfBirth?: string | null;
    nationality?: string | null;
    citizenship?: string | null;
    residenceCountry?: string | null;
    residenceCity?: string | null;
    residenceAddress?: string | null;
    purposeOfStay?: string | null;
    documentType?: string | null;
    documentNumber?: string | null;
    visaNumber?: string | null;
    notes?: string | null;
  }>;
  virtualKeys?: VirtualKey[];
}

async function getBookingByToken(token: string): Promise<BookingData | null> {
  try {
    // Use database directly instead of calling API to avoid issues during SSR
    const { prisma } = await import('@/lib/database');

    const booking = await prisma.booking.findUnique({
      where: { checkInToken: token },
      include: {
        guests: true,
        payments: true
      }
    });

    if (!booking) {
      return null;
    }

    // Transform the booking data to match the expected interface
    const cityTaxPolicy = getCityTaxPolicy({
      propertyName: booking.propertyName
    });

    const guestPayloads = booking.guests.map((guest) => ({
      id: guest.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      phone: guest.phone,
      phoneCountryCode: guest.phoneCountryCode,
      dateOfBirth: guest.dateOfBirth ? guest.dateOfBirth.toISOString() : null,
      nationality: guest.nationality,
      citizenship: guest.citizenship,
      residenceCountry: guest.residenceCountry,
      residenceCity: guest.residenceCity,
      residenceAddress: guest.residenceAddress,
      purposeOfStay: guest.purposeOfStay,
      documentType: guest.documentType,
      documentNumber: guest.documentNumber,
      visaNumber: guest.visaNumber,
      notes: guest.notes
    }));

    const cityTaxGuests: CityTaxGuestInput[] = booking.guests.map((guest) => ({
      dateOfBirth: guest.dateOfBirth ?? null,
      residenceCity: guest.residenceCity ?? null,
    }));

    const cityTaxAmount = calculateCityTaxForStay(
      cityTaxGuests,
      booking.checkInDate,
      booking.checkOutDate,
      {
        propertyName: booking.propertyName,
        propertyAddress: booking.roomNumber ?? undefined,
      }
    );

    return {
      id: booking.id,
      propertyName: booking.propertyName,
      propertyAddress: booking.roomNumber ?? undefined,
      checkInDate: booking.checkInDate.toISOString(),
      checkOutDate: booking.checkOutDate.toISOString(),
      numberOfGuests: booking.numberOfGuests,
      roomNumber: booking.roomNumber || undefined,
      guestLeaderName: booking.guestLeaderName,
      cityTaxAmount,
      cityTaxPerPerson: cityTaxPolicy.taxPerPersonPerNight,
      universalKeypadCode: booking.universalKeypadCode || undefined,
      status: booking.status,
      payments: booking.payments.map(payment => ({
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        stripePaymentIntentId: payment.stripePaymentIntentId,
        currency: payment.currency
      })),
      guests: guestPayloads,
      virtualKeys: [] // Not included in this simplified version
    };
  } catch (error) {
    console.error('Error fetching booking for metadata:', error);
    return null;
  }
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ bookingId: string }>
}): Promise<Metadata> {
  const { bookingId } = await params;
  const booking = await getBookingByToken(bookingId);

  if (!booking) {
    return {
      title: 'Check-in Not Found | Nick & Jenny',
      description: 'The check-in link you used is invalid or expired. Please contact us for assistance.',
      robots: { index: false, follow: false }
    };
  }

  const checkInDate = new Date(booking.checkInDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const checkOutDate = new Date(booking.checkOutDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const title = `Check-in: ${booking.propertyName} | Nick & Jenny`;
  const description = `Welcome ${booking.guestLeaderName}! Complete your check-in for ${booking.propertyName}. Stay: ${checkInDate} - ${checkOutDate} • ${booking.numberOfGuests} guest${booking.numberOfGuests > 1 ? 's' : ''}`;

  return {
    title,
    description,
    robots: {
      index: false, // Don't index check-in pages for privacy
      follow: false
    },
    openGraph: {
      title,
      description,
      type: 'website',
      images: [
        {
          url: '/og-checkin.jpg', // We'll need to create this image
          width: 1200,
          height: 630,
          alt: `Check-in for ${booking.propertyName}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-checkin.jpg'],
    },
  };
}

export default async function CheckinPage({
  params
}: {
  params: Promise<{ bookingId: string }>
}) {
  const { bookingId } = await params;
  const booking = await getBookingByToken(bookingId);

  if (!booking) {
    notFound();
  }

  // Pass the booking data to the client component
  return <CheckinClient initialBooking={booking} />;
}
