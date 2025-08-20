"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Star, Users, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import Link from "next/link";

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

export default function Home() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetch('/api/properties');
        const data = await response.json();
        
        if (data.success) {
          setProperties(data.data);
        } else {
          setError(data.error || 'Failed to load properties');
        }
      } catch {
        setError('Failed to connect to property service');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size={60} />
              <div>
                <h1 className="text-2xl font-bold text-black">Nick & Jenny</h1>
                <p className="text-sm text-gray-600">Premium Accommodations</p>
              </div>
            </div>
            <Button variant="outline" className="border-black text-black hover:bg-black hover:text-white">
              Contact Us
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold text-black mb-6">
            Exceptional Stays in<br />
            <span className="text-gray-600">Beautiful Locations</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Discover our carefully curated collection of premium accommodations. 
            Each property offers unique experiences with uncompromising comfort and style.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-black text-black" />
              <span>Premium Quality</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Personal Service</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Easy Booking</span>
            </div>
          </div>
        </div>
      </section>

      <Separator className="bg-gray-200" />

      {/* Properties Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-black mb-4">Our Properties</h3>
            <p className="text-gray-600 max-w-xl mx-auto">
              Each location has been selected for its exceptional character and prime position
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading properties...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="border-black text-black hover:bg-black hover:text-white"
              >
                Try Again
              </Button>
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No properties available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map((property) => {
                // Get the first image from listingImages or use thumbnail
                const imageUrl = property.listingImages?.[0]?.url || property.thumbnailUrl;
                
                return (
                  <Card key={property.id} className="group hover:shadow-lg transition-all duration-300 border-gray-200 flex flex-col h-full">
                    <CardHeader className="pb-4">
                      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-4 overflow-hidden">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={imageUrl}
                            alt={property.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">Photo coming soon</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <CardTitle className="text-xl font-bold text-black group-hover:text-gray-700 transition-colors line-clamp-2">
                        {property.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{property.address}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col justify-between">
                      <div className="space-y-3 mb-4">
                        {/* Property details */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4 text-gray-600">
                            {property.bedroomsNumber && (
                              <span>{property.bedroomsNumber} bed{property.bedroomsNumber !== 1 ? 's' : ''}</span>
                            )}
                            {property.bathroomsNumber && (
                              <span>{property.bathroomsNumber} bath{property.bathroomsNumber !== 1 ? 's' : ''}</span>
                            )}
                            {property.personCapacity && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {property.personCapacity}
                              </span>
                            )}
                          </div>
                        </div>
                        
                      </div>
                      
                      <Link href={`/property/${property.id}`}>
                        <Button className="w-full bg-black hover:bg-gray-800 text-white group">
                          View Details
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Logo size={40} className="invert" />
                <h4 className="text-lg font-bold">Nick & Jenny</h4>
              </div>
              <p className="text-gray-400">
                Creating exceptional accommodation experiences with personal attention to detail.
              </p>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Contact</h5>
              <div className="text-gray-400 space-y-2">
                <p>Email: hello@nickandjenny.com</p>
                <p>Phone: +420 xxx xxx xxx</p>
              </div>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Services</h5>
              <div className="text-gray-400 space-y-2">
                <p>Premium Accommodations</p>
                <p>Concierge Services</p>
                <p>Local Experiences</p>
              </div>
            </div>
          </div>
          <Separator className="my-8 bg-gray-800" />
          <div className="text-center text-gray-400">
            <p>&copy; 2024 Nick & Jenny. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}