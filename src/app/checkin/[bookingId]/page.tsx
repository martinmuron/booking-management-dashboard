import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CheckinClient from './CheckinClient';

interface BookingData {
  id: string;
  hostAwayId: string;
  propertyName: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  guestLeaderName: string;
  guestLeaderEmail: string;
  guestLeaderPhone: string;
  totalAmount: number;
  currencyCode: string;
  status: string;
  propertyAddress?: string;
  guests: any[];
  payments: any[];
  virtualKeys: any[];
}

async function getBookingByToken(token: string): Promise<BookingData | null> {
  try {
    // Call the API endpoint to get booking data
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.nickandjenny.cz';
    const response = await fetch(`${baseUrl}/api/check-in?token=${token}`, {
      cache: 'no-store' // Always get fresh data for metadata
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.success ? data.data.booking : null;
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