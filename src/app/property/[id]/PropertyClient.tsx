"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Star, Users, Calendar, ArrowLeft, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ImageModal } from "@/components/ImageModal";
import Link from "next/link";

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

interface PropertyClientProps {
  initialProperty?: PropertyDetail;
}

export default function PropertyClient({ initialProperty }: PropertyClientProps) {
  const params = useParams();
  const propertyId = params.id as string;
  const [property, setProperty] = useState<PropertyDetail | null>(initialProperty || null);
  const [loading, setLoading] = useState(!initialProperty);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!initialProperty) {
      const fetchProperty = async () => {
        try {
          // For now, we'll simulate fetching a single property by filtering the properties list
          const response = await fetch('/api/properties');
          const data = await response.json();

          if (data.success) {
            const foundProperty = data.data.find((p: PropertyDetail) => p.id.toString() === propertyId);
            if (foundProperty) {
              setProperty(foundProperty);
            } else {
              setError('Property not found');
            }
          } else {
            setError(data.error || 'Failed to load property');
          }
        } catch {
          setError('Failed to connect to property service');
        } finally {
          setLoading(false);
        }
      };

      fetchProperty();
    }
  }, [propertyId, initialProperty]);

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleModalNavigate = (index: number) => {
    setCurrentImageIndex(index);
  };

  // Prepare images for modal
  const modalImages = property?.listingImages || (property?.thumbnailUrl ? [
    { id: 0, url: property.thumbnailUrl, caption: property.name }
  ] : []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="text-gray-600">Loading property details...</span>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Property Not Found</h1>
            <p className="text-gray-600 mb-8">{error || 'The property you are looking for does not exist.'}</p>
            <Link href="/">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Properties
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo size="sm" />
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Properties
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {/* Main Image */}
              {property.thumbnailUrl && (
                <div
                  className="aspect-[16/10] relative rounded-lg overflow-hidden cursor-pointer group"
                  onClick={() => handleImageClick(0)}
                >
                  <img
                    src={property.thumbnailUrl}
                    alt={property.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
              )}

              {/* Additional Images Grid */}
              {property.listingImages && property.listingImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {property.listingImages.slice(0, 6).map((image, index) => (
                    <div
                      key={image.id}
                      className="aspect-square relative rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => handleImageClick(index + 1)}
                    >
                      <img
                        src={image.url}
                        alt={image.caption || `${property.name} - Image ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Property Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{property.address}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Key Stats */}
                <div className="grid grid-cols-3 gap-4 py-4 border rounded-lg bg-gray-50">
                  <div className="text-center">
                    <div className="font-semibold text-lg">{property.bedroomsNumber}</div>
                    <div className="text-sm text-gray-600">Bedrooms</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-lg">{property.bathroomsNumber}</div>
                    <div className="text-sm text-gray-600">Bathrooms</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-lg">{property.personCapacity}</div>
                    <div className="text-sm text-gray-600">Guests</div>
                  </div>
                </div>

                {/* Price */}
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {property.currencyCode} {property.price}
                  </div>
                  <div className="text-sm text-gray-600">per night</div>
                </div>

                {/* Booking Links */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Book Now</h3>
                  {property.airbnbListingUrl && (
                    <a
                      href={property.airbnbListingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button className="w-full" variant="default">
                        Book on Airbnb
                      </Button>
                    </a>
                  )}
                  {property.vrboListingUrl && (
                    <a
                      href={property.vrboListingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button className="w-full" variant="outline">
                        Book on VRBO
                      </Button>
                    </a>
                  )}
                  {property.expediaListingUrl && (
                    <a
                      href={property.expediaListingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button className="w-full" variant="outline">
                        Book on Expedia
                      </Button>
                    </a>
                  )}
                </div>

                {/* Amenities */}
                {property.listingAmenities && property.listingAmenities.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Amenities</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {property.listingAmenities.slice(0, 10).map((amenity) => (
                        <div key={amenity.id} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm">{amenity.amenityName}</span>
                        </div>
                      ))}
                      {property.listingAmenities.length > 10 && (
                        <div className="text-sm text-gray-500 mt-2">
                          +{property.listingAmenities.length - 10} more amenities
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Description */}
        {property.description && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">About This Property</h2>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {property.description}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        images={modalImages}
        currentIndex={currentImageIndex}
        onNavigate={handleModalNavigate}
      />
    </div>
  );
}