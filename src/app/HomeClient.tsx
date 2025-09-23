"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Users, Calendar, ArrowRight, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PropertySearch } from "@/components/PropertySearch";
import { CountUpAnimation } from "@/components/CountUpAnimation";
import Link from "next/link";
import Image from "next/image";

interface Property {
  id: number;
  name: string;
  address: string;
  thumbnailUrl?: string;
  listingImages?: Array<{ url: string; caption?: string }>;
  price?: number;
  currencyCode?: string;
  bedroomsNumber?: number;
  bathroomsNumber?: number;
  personCapacity?: number;
  airbnbListingUrl?: string;
  vrboListingUrl?: string;
}

interface PropertyWithAvailability extends Property {
  availability?: {
    available: boolean;
    unavailableDates: string[];
    minimumStay?: number;
    averagePrice?: number;
  };
}

interface SearchCriteria {
  checkInDate: Date | null;
  checkOutDate: Date | null;
  guests: number;
}

export default function HomeClient() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [displayProperties, setDisplayProperties] = useState<PropertyWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/properties');
      const data = await response.json();

      if (data.success) {
        setProperties(data.data || []);
        setDisplayProperties(data.data || []);
      } else {
        setError('Failed to load properties');
      }
    } catch {
      setError('Network error: Unable to load properties');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (criteria: SearchCriteria) => {
    setSearching(true);
    setSearchCriteria(criteria);

    try {
      // Show properties with availability status
      const propertiesWithAvailability: PropertyWithAvailability[] = properties.map(property => ({
        ...property,
        availability: {
          available: Math.random() > 0.3, // Simulate availability
          unavailableDates: [],
          minimumStay: Math.floor(Math.random() * 3) + 1,
          averagePrice: property.price ? property.price + Math.floor(Math.random() * 50) : undefined,
        }
      }));

      setDisplayProperties(propertiesWithAvailability);
    } catch {
      setError('Failed to check availability');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchCriteria(null);
    setDisplayProperties(properties);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="text-gray-600">Loading properties...</span>
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
            <Logo size="lg" />
            <div className="flex items-center gap-3">
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
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-black mb-6">
            Experience Prague
            <span className="block text-gray-600">Like a Local</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Thoughtfully renovated apartments in the heart of Prague.
            Modern amenities, prime locations, and exceptional hospitality for your perfect stay.
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="text-center">
              <div className="text-3xl font-bold text-black mb-2">
                <CountUpAnimation end={properties.length} />
              </div>
              <div className="text-sm text-gray-600">Premium Properties</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-black mb-2">
                <CountUpAnimation end={8000} suffix="+" />
              </div>
              <div className="text-sm text-gray-600">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-black mb-2">
                <CountUpAnimation end={94} suffix="/10" />
              </div>
              <div className="text-sm text-gray-600">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-black mb-2">
                <CountUpAnimation end={24} suffix="/7" />
              </div>
              <div className="text-sm text-gray-600">Guest Support</div>
            </div>
          </div>

          {/* Property Search */}
          <div className="max-w-4xl mx-auto">
            <PropertySearch onSearch={handleSearch} />
          </div>
        </div>
      </section>

      {/* Search Results or Properties */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-black">
              {searchCriteria ? 'Search Results' : 'Our Properties'}
            </h2>
            {searchCriteria && (
              <Button
                variant="outline"
                onClick={clearSearch}
                className="border-black text-black hover:bg-black hover:text-white"
              >
                Clear Search
              </Button>
            )}
          </div>

          {searching ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Checking availability...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <XCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600">{error}</p>
              <Button
                onClick={fetchProperties}
                variant="outline"
                className="mt-4 border-black text-black hover:bg-black hover:text-white"
              >
                Try Again
              </Button>
            </div>
          ) : displayProperties.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No properties found for your search criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayProperties.map((property) => {
                return (
                  <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                    <div className="aspect-video relative overflow-hidden">
                      {property.thumbnailUrl ? (
                        <Image
                          src={property.thumbnailUrl}
                          alt={property.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                          quality={75}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <MapPin className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      {searchCriteria && property.availability && (
                        <div className="absolute top-3 right-3">
                          <Badge
                            variant={property.availability.available ? "default" : "destructive"}
                            className={property.availability.available ? "bg-green-600" : ""}
                          >
                            {property.availability.available ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Available
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Unavailable
                              </>
                            )}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg line-clamp-1">{property.name}</CardTitle>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm line-clamp-1">{property.address}</span>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {/* Property details */}
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {property.bedroomsNumber && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{property.bedroomsNumber} bed</span>
                            </div>
                          )}
                        {property.personCapacity && (
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{property.personCapacity} guests</span>
                          </div>
                        )}
                      </div>

                      {/* Price */}
                      {(property.price || property.availability?.averagePrice) && (
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-black">
                            {property.currencyCode || 'EUR'} {property.availability?.averagePrice || property.price}
                          </span>
                          <span className="text-sm text-gray-600">/ night</span>
                        </div>
                      )}

                      <Separator />

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <Link href={`/property/${property.id}`} className="w-full">
                          <Button variant="outline" size="sm" className="w-full">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <Logo size="md" className="mb-4" />
              <p className="text-gray-600 text-sm">
                Two Brits renovating beautiful properties across Prague,
                creating exceptional experiences for our guests.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-black mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link href="/about" className="block text-sm text-gray-600 hover:text-black">
                  About Us
                </Link>
                <Link href="/contact" className="block text-sm text-gray-600 hover:text-black">
                  Contact
                </Link>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-black mb-4">Contact</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Prague, Czech Republic</p>
                <p>hello@nickandjenny.cz</p>
              </div>
            </div>
          </div>
          <Separator className="my-8" />
          <div className="text-center text-sm text-gray-600">
            <p>&copy; 2024 Nick & Jenny. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
