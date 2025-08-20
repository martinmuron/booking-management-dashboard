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
              <h1 className="text-xl font-bold text-black">Nick & Jenny</h1>
            </div>
            <Button className="bg-black hover:bg-gray-800 text-white">
              Book Now
            </Button>
          </div>
        </div>
      </header>

      {/* Property Images */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
              {property.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={property.thumbnailUrl} 
                  alt={property.name}
                  className="w-full h-full object-cover rounded-lg"
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
              ))}
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
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-black">
                      {property.price} {property.currencyCode}
                    </span>
                    <span className="text-gray-500">/ night</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full bg-black hover:bg-gray-800 text-white">
                    Check availability
                  </Button>
                  <div className="text-center text-sm text-gray-500">
                    You won&apos;t be charged yet
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base rate</span>
                      <span>{property.price} {property.currencyCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">City tax</span>
                      <span>50 CZK / person / night</span>
                    </div>
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