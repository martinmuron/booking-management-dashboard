"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Star, Users, Calendar, ArrowLeft, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
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

export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [propertyId]);

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
        <header className="border-b border-gray-200">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm" className="border-black text-black hover:bg-black hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Properties
                </Button>
              </Link>
              <Logo size={40} />
              <h1 className="text-xl font-bold text-black">Nick & Jenny</h1>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-black mb-4">Property Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/">
            <Button className="bg-black hover:bg-gray-800 text-white">
              View All Properties
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm" className="border-black text-black hover:bg-black hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Properties
                </Button>
              </Link>
              <Logo size={40} />
              <div>
                <h1 className="text-xl font-bold text-black">Nick & Jenny</h1>
                <p className="text-xs text-gray-600">Premium Accommodations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-3">
                <Link href="/about">
                  <Button variant="ghost" size="sm" className="text-black hover:bg-gray-100">
                    About Us
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" size="sm" className="border-black text-black hover:bg-black hover:text-white">
                    Contact
                  </Button>
                </Link>
              </div>
            {/* Header booking button - prioritize Airbnb, then VRBO, then Expedia */}
            {property.airbnbListingUrl ? (
              <a href={property.airbnbListingUrl} target="_blank" rel="noopener noreferrer">
                <Button className="bg-black hover:bg-gray-800 text-white">
                  Book Now
                </Button>
              </a>
            ) : property.vrboListingUrl ? (
              <a href={property.vrboListingUrl} target="_blank" rel="noopener noreferrer">
                <Button className="bg-black hover:bg-gray-800 text-white">
                  Book Now
                </Button>
              </a>
            ) : property.expediaListingUrl ? (
              <a href={property.expediaListingUrl} target="_blank" rel="noopener noreferrer">
                <Button className="bg-black hover:bg-gray-800 text-white">
                  Book Now
                </Button>
              </a>
            ) : (
              <Button className="bg-black hover:bg-gray-800 text-white" disabled>
                Book Now
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Property Images */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
              {property.listingImages?.[0]?.url || property.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={property.listingImages?.[0]?.url || property.thumbnailUrl} 
                  alt={property.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Photo coming soon</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {property.listingImages?.slice(1, 5).map((image, index) => (
                <div key={image.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={image.url} 
                    alt={image.caption || `View ${index + 2}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )) || (
                // Show placeholder if no additional images
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-gray-400" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Property Details */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-black mb-2">{property.name}</h1>
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <MapPin className="w-4 h-4" />
                  <span>{property.address}</span>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{property.personCapacity} guests</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{property.bedroomsNumber} bedroom{property.bedroomsNumber !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-black text-black" />
                    <span>{property.bathroomsNumber} bathroom{property.bathroomsNumber !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-black mb-4">About this place</h2>
                <div className="prose max-w-none">
                  <p className="text-gray-600 leading-relaxed">
                    {property.description.split('\n\n')[0]}
                  </p>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-black mb-4">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {property.listingAmenities?.slice(0, 12).map((amenity) => (
                    <div key={amenity.id} className="flex items-center gap-2 text-gray-600">
                      <div className="w-2 h-2 bg-black rounded-full"></div>
                      <span className="text-sm">{amenity.amenityName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-black">Book Your Stay</h3>
                    <p className="text-sm text-gray-600">Choose your preferred platform</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Book Directly - Featured Option */}
                  <div className="relative">
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                      SAVE 10%
                    </div>
                    <a href="https://myprague.holiday" target="_blank" rel="noopener noreferrer" className="block">
                      <Button className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 shadow-lg border-2 border-green-500 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                        <span className="relative flex items-center justify-center gap-2">
                          🏠 Book Directly & Save 10%
                        </span>
                      </Button>
                    </a>
                    <p className="text-xs text-center text-green-700 font-semibold mt-1">
                      Best rates guaranteed!
                    </p>
                  </div>

                  <div className="text-center py-2">
                    <span className="text-sm text-gray-400">or choose a platform:</span>
                  </div>

                  {/* Booking platform buttons */}
                  <div className="space-y-2">
                    {property.airbnbListingUrl && (
                      <a href={property.airbnbListingUrl} target="_blank" rel="noopener noreferrer" className="block">
                        <Button className="w-full bg-[#ff5a5f] hover:bg-[#e7484d] text-white">
                          Book on Airbnb
                        </Button>
                      </a>
                    )}
                    {property.vrboListingUrl && (
                      <a href={property.vrboListingUrl} target="_blank" rel="noopener noreferrer" className="block">
                        <Button className="w-full bg-[#0073e6] hover:bg-[#005bb5] text-white">
                          Book on VRBO
                        </Button>
                      </a>
                    )}
                    {property.expediaListingUrl && (
                      <a href={property.expediaListingUrl} target="_blank" rel="noopener noreferrer" className="block">
                        <Button className="w-full bg-[#ffc72c] hover:bg-[#e6b329] text-black">
                          Book on Expedia
                        </Button>
                      </a>
                    )}
                    {!property.airbnbListingUrl && !property.vrboListingUrl && !property.expediaListingUrl && (
                      <Button className="w-full bg-black hover:bg-gray-800 text-white" disabled>
                        Check availability
                      </Button>
                    )}
                  </div>
                  <div className="text-center text-sm text-gray-500">
                    You won&apos;t be charged yet
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}