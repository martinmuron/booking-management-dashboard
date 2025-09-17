import { Metadata } from 'next';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: 'Nick & Jenny | Premium Vacation Rentals in Prague',
  description: 'Experience Prague like a local with Nick & Jenny\'s thoughtfully renovated apartments. Modern amenities, prime locations, and exceptional hospitality for your perfect stay in the heart of Czech Republic.',
  keywords: [
    'Prague vacation rentals',
    'Prague apartments',
    'Prague accommodation',
    'short term rentals Prague',
    'Airbnb Prague',
    'VRBO Prague',
    'Prague city center apartments',
    'Prague holiday rentals',
    'vacation rentals Czech Republic',
    'Nick and Jenny Prague',
    'Prague tourist accommodation'
  ],
  authors: [{ name: 'Nick & Jenny' }],
  creator: 'Nick & Jenny',
  publisher: 'Nick & Jenny',
  openGraph: {
    title: 'Nick & Jenny | Premium Vacation Rentals in Prague',
    description: 'Experience Prague like a local with Nick & Jenny\'s thoughtfully renovated apartments. Modern amenities, prime locations, and exceptional hospitality.',
    type: 'website',
    locale: 'en_US',
    url: 'https://www.nickandjenny.cz',
    siteName: 'Nick & Jenny',
    images: [
      {
        url: '/og-home.jpg', // We'll need to create this image
        width: 1200,
        height: 630,
        alt: 'Nick & Jenny - Premium Prague Vacation Rentals',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nick & Jenny | Premium Vacation Rentals in Prague',
    description: 'Experience Prague like a local with thoughtfully renovated apartments. Modern amenities, prime locations, exceptional hospitality.',
    images: ['/og-home.jpg'],
    creator: '@nickandjenny', // Update if you have Twitter
  },
  alternates: {
    canonical: '/',
  },
  other: {
    'google-site-verification': 'your-google-verification-code', // Add when available
  },
};

export default function HomePage() {
  return <HomeClient />;
}