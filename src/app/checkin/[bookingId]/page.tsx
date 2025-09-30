import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CheckinClient from './CheckinClient';
import { getCityTaxPolicy, calculateCityTaxForStay, type CityTaxGuestInput } from '@/lib/city-tax';
import { hostAwayService } from '@/services/hostaway.service';

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
  listingId?: number;
  checkInDate: string;
  checkOutDate: string;
  checkInDateLabel: string;
  checkOutDateLabel: string;
  checkInTimeLabel: string;
  checkOutTimeLabel: string;
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
        payments: true,
        virtualKeys: true,
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
      // Format dateOfBirth as YYYY-MM-DD to match client expectation (prevents hydration mismatch)
      dateOfBirth: guest.dateOfBirth ? guest.dateOfBirth.toISOString().split('T')[0] : '',
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

    // Manual date/time formatting to ensure server/client consistency
    // Use Intl.DateTimeFormat parts to extract timezone-aware values
    const formatDateLabel = (date: Date): string => {
      const formatter = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Europe/Prague'
      });

      const parts = formatter.formatToParts(date);
      const weekday = parts.find(p => p.type === 'weekday')?.value || '';
      const month = parts.find(p => p.type === 'month')?.value || '';
      const day = parts.find(p => p.type === 'day')?.value || '';
      const year = parts.find(p => p.type === 'year')?.value || '';

      return `${weekday}, ${month} ${day}, ${year}`;
    };

    const formatTimeLabel = (date: Date): string => {
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Europe/Prague'
      });

      const parts = formatter.formatToParts(date);
      const hour = parts.find(p => p.type === 'hour')?.value || '';
      const minute = parts.find(p => p.type === 'minute')?.value || '';
      const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value || '';

      // Pad hour to 2 digits
      const hourPadded = hour.padStart(2, '0');

      return `${hourPadded}:${minute} ${dayPeriod.toUpperCase()}`;
    };

    const checkInDateLabel = formatDateLabel(booking.checkInDate);
    const checkOutDateLabel = formatDateLabel(booking.checkOutDate);
    const checkInTimeLabel = formatTimeLabel(booking.checkInDate);
    const checkOutTimeLabel = formatTimeLabel(booking.checkOutDate);

    let listingId: number | undefined;
    if (booking.hostAwayId) {
      try {
        const reservationId = Number(booking.hostAwayId.replace(/[^0-9]/g, ''));
        if (reservationId) {
          const reservation = await hostAwayService.getReservationById(reservationId);
          if (reservation?.listingMapId) {
            listingId = reservation.listingMapId;
          }
        }
      } catch (hostAwayError) {
        console.warn('Failed to resolve HostAway listing for check-in booking:', hostAwayError);
      }
    }

    return {
      id: booking.id,
      propertyName: booking.propertyName,
      propertyAddress: booking.roomNumber ?? undefined,
      listingId,
      checkInDate: booking.checkInDate.toISOString(),
      checkOutDate: booking.checkOutDate.toISOString(),
      numberOfGuests: booking.numberOfGuests,
      roomNumber: booking.roomNumber || undefined,
      guestLeaderName: booking.guestLeaderName,
      cityTaxAmount,
      cityTaxPerPerson: cityTaxPolicy.taxPerPersonPerNight,
      universalKeypadCode: booking.universalKeypadCode || undefined,
      checkInDateLabel,
      checkOutDateLabel,
      checkInTimeLabel,
      checkOutTimeLabel,
      status: booking.status,
      payments: booking.payments.map(payment => ({
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        stripePaymentIntentId: payment.stripePaymentIntentId,
        currency: payment.currency
      })),
      virtualKeys: booking.virtualKeys.map(key => ({
        id: key.id,
        keyType: key.keyType,
        nukiKeyId: key.nukiKeyId,
        isActive: key.isActive,
        createdAt: key.createdAt.toISOString(),
        deactivatedAt: key.deactivatedAt ? key.deactivatedAt.toISOString() : undefined,
      })),
      guests: guestPayloads,
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
