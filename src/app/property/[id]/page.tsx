import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PropertyClient from './PropertyClient';
import { hostAwayService, type HostAwayListing } from '@/services/hostaway.service';

async function getPropertyById(propertyId: string): Promise<HostAwayListing | null> {
  try {
    // Directly use the hostaway service instead of making an HTTP request
    const properties = await hostAwayService.getListings();
    const property = properties.find((p: HostAwayListing) => p.id.toString() === propertyId);
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
  const description = `${property.bedroomsNumber || 'Beautiful'} bedroom, ${property.bathroomsNumber || 'modern'} bathroom apartment in ${property.address.includes('Prague') ? property.address : `${property.address}, Prague`}. Sleeps ${property.personCapacity || 'guests'}. ${property.price && property.currencyCode ? `From ${property.currencyCode} ${property.price}/night.` : ''} ${keyAmenities ? `Features: ${keyAmenities}.` : ''} Book now on Airbnb, VRBO, or Expedia.`.trim();

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
      ...(property.bedroomsNumber ? [`${property.bedroomsNumber} bedroom Prague`] : []),
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
