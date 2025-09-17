import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PropertyClient from './PropertyClient';

interface PropertyDetail {
  id: number;
  name: string;
  address: string;
  description: string;
  personCapacity: number;
  bedroomsNumber: number;
  bathroomsNumber: number;
  price: number;
  currencyCode: string;
  thumbnailUrl?: string;
  listingImages?: Array<{
    id: number;
    url: string;
    caption: string;
  }>;
  listingAmenities?: Array<{
    id: number;
    amenityName: string;
  }>;
  airbnbListingUrl?: string;
  vrboListingUrl?: string;
  expediaListingUrl?: string;
}

async function getPropertyById(propertyId: string): Promise<PropertyDetail | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.nickandjenny.cz';
    const response = await fetch(`${baseUrl}/api/properties`, {
      cache: 'force-cache', // Cache properties for better performance
      next: { revalidate: 3600 } // Revalidate every hour
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data.success) {
      return null;
    }

    const property = data.data.find((p: PropertyDetail) => p.id.toString() === propertyId);
    return property || null;
  } catch (error) {
    console.error('Error fetching property for metadata:', error);
    return null;
  }
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params;
  const property = await getPropertyById(id);

  if (!property) {
    return {
      title: 'Property Not Found | Nick & Jenny',
      description: 'The property you are looking for is not available. Browse our other beautiful Prague vacation rentals.',
      robots: { index: false, follow: false }
    };
  }

  // Extract key amenities for description
  const keyAmenities = property.listingAmenities
    ?.slice(0, 3)
    .map(a => a.amenityName)
    .join(', ') || '';

  const title = `${property.name} | Nick & Jenny Prague Rentals`;
  const description = `${property.bedroomsNumber} bedroom, ${property.bathroomsNumber} bathroom apartment in ${property.address.includes('Prague') ? property.address : `${property.address}, Prague`}. Sleeps ${property.personCapacity}. From ${property.currencyCode} ${property.price}/night. ${keyAmenities ? `Features: ${keyAmenities}.` : ''} Book now on Airbnb, VRBO, or Expedia.`.trim();

  // Create a clean description for meta (remove line breaks)
  const cleanDescription = property.description
    ? property.description.replace(/\n/g, ' ').substring(0, 300).trim()
    : description;

  return {
    title,
    description: cleanDescription,
    keywords: [
      `${property.name.toLowerCase()}`,
      'Prague vacation rental',
      'Prague apartment',
      `${property.bedroomsNumber} bedroom Prague`,
      property.address.toLowerCase(),
      'Airbnb Prague',
      'VRBO Prague',
      'short term rental Prague',
      ...property.listingAmenities?.slice(0, 5).map(a => a.amenityName.toLowerCase()) || []
    ],
    openGraph: {
      title,
      description: cleanDescription,
      type: 'website',
      images: [
        {
          url: property.thumbnailUrl || '/og-property.jpg',
          width: 1200,
          height: 630,
          alt: `${property.name} - Prague Vacation Rental`,
        },
        ...(property.listingImages?.slice(0, 3).map(img => ({
          url: img.url,
          width: 1200,
          height: 630,
          alt: img.caption || `${property.name} - Additional Image`,
        })) || [])
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: cleanDescription,
      images: [property.thumbnailUrl || '/og-property.jpg'],
    },
    alternates: {
      canonical: `/property/${property.id}`,
    },
  };
}

export default async function PropertyDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const property = await getPropertyById(id);

  if (!property) {
    notFound();
  }

  return <PropertyClient initialProperty={property} />;
}