import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CheckinClient from './CheckinClient';

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
    return {
      id: booking.id,
      propertyName: booking.propertyName,
      propertyAddress: undefined,
      checkInDate: booking.checkInDate.toISOString(),
      checkOutDate: booking.checkOutDate.toISOString(),
      numberOfGuests: booking.numberOfGuests,
      roomNumber: booking.roomNumber || undefined,
      guestLeaderName: booking.guestLeaderName,
      cityTaxAmount: 0,
      cityTaxPerPerson: 50,
      universalKeypadCode: booking.universalKeypadCode || undefined,
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
