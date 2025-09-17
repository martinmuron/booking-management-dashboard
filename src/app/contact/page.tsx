import { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'Contact Us | Nick & Jenny',
  description: 'Get in touch with Nick & Jenny for inquiries about our Prague vacation rentals. We\'re here to help make your stay perfect.',
  keywords: [
    'contact Nick Jenny',
    'Prague vacation rental contact',
    'accommodation Prague support',
    'Nick Jenny customer service',
    'Prague rental inquiry'
  ],
  openGraph: {
    title: 'Contact Us | Nick & Jenny',
    description: 'Get in touch with Nick & Jenny for inquiries about our Prague vacation rentals. We\'re here to help make your stay perfect.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Contact Us | Nick & Jenny',
    description: 'Get in touch with Nick & Jenny for inquiries about our Prague vacation rentals.',
  },
  alternates: {
    canonical: '/contact',
  },
};

export default function ContactPage() {
  return <ContactClient />;
}