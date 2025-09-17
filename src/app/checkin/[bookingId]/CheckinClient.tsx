"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StripePayment from "@/components/ui/stripe-payment";
import { hasNukiAccess, getNukiPropertyType } from "@/utils/nuki-properties";
import {
  Calendar,
  Users,
  CreditCard,
  Key,
  MapPin,
  Clock,
  User,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Home,
  Wifi,
  ShoppingBag,
  Heart,
  Video,
  Navigation,
  Utensils,
  Building2,
  Mountain,
  Activity,
  Menu,
  X,
  ChevronRight,
  Shield
} from "lucide-react";

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  dateOfBirth: string;
  nationality: string;
  citizenship: string;
  residenceCountry: string;
  documentType: string;
  documentNumber: string;
  documentIssueDate: string;
  documentExpiryDate: string;
}

interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'paid' | 'failed';
  stripePaymentIntentId?: string;
  createdAt: string;
  paidAt?: string;
}

interface VirtualKey {
  id: string;
  name: string;
  validFrom: string;
  validTo: string;
  nukiDeviceId: string;
  deviceName?: string;
  isActive: boolean;
  createdAt: string;
}

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
  guests: Guest[];
  payments: Payment[];
  virtualKeys: VirtualKey[];
  propertyAddress?: string;
}

interface CheckinClientProps {
  initialBooking?: BookingData;
}

export default function CheckinClient({ initialBooking }: CheckinClientProps) {
  const params = useParams();
  const bookingToken = params.bookingId as string;

  const [booking, setBooking] = useState<BookingData | null>(initialBooking || null);
  const [loading, setLoading] = useState(!initialBooking);
  const [error, setError] = useState<string | null>(null);

  // Check if this property should have NUKI access
  const propertyHasNukiAccess = booking ? hasNukiAccess(booking.propertyName) : false;
  const propertyType = booking ? getNukiPropertyType(booking.propertyName) : 'unauthorized';

  // Rest of the component logic would go here...
  // This is a placeholder for now - you'd move all the existing logic from the original page.tsx

  useEffect(() => {
    if (!initialBooking) {
      // Fetch booking data if not provided by server
      const fetchBooking = async () => {
        try {
          const response = await fetch(`/api/check-in?token=${bookingToken}`);
          const data = await response.json();

          if (data.success) {
            setBooking(data.data.booking);
          } else {
            setError(data.error || 'Failed to load booking');
          }
        } catch (err) {
          setError('Network error: Unable to load booking details');
        } finally {
          setLoading(false);
        }
      };

      fetchBooking();
    }
  }, [bookingToken, initialBooking]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Check-in Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error || 'Booking not found. Please check your check-in link.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to {booking.propertyName}</CardTitle>
            <CardDescription>
              Complete your check-in process for your stay from {new Date(booking.checkInDate).toLocaleDateString()} to {new Date(booking.checkOutDate).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{booking.numberOfGuests} guests</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{booking.guestLeaderName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{booking.propertyAddress || 'Prague, Czech Republic'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Digital Access Section - Only for authorized NUKI properties */}
        {propertyHasNukiAccess && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Shield className="h-5 w-5" />
                Digital Access Available
              </CardTitle>
              <CardDescription className="text-blue-700">
                This property features smart lock technology for keyless entry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-blue-200">
                  <Key className="h-5 w-5 text-blue-600 mt-1" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 mb-1">Access Code Generation</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Your digital access code will be generated automatically 5 days before your check-in date,
                      after completing guest registration and payment.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-blue-600">
                      <CheckCircle className="h-3 w-3" />
                      <span>Works on all property doors</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-blue-600 mt-1">
                      <Clock className="h-3 w-3" />
                      <span>Valid from check-in to check-out date</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Building2 className="h-4 w-4" />
                    <span>Main entrance access</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <Home className="h-4 w-4" />
                    <span>Apartment door access</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <ShoppingBag className="h-4 w-4" />
                    <span>Luggage room (if available)</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <Activity className="h-4 w-4" />
                    <span>Laundry room (if available)</span>
                  </div>
                </div>

                <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> You'll receive your access code via email and SMS closer to your arrival date.
                    No physical keys needed!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Standard Check-in Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Check-in Process
            </CardTitle>
            <CardDescription>
              Complete your registration to finalize your stay
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Required Steps:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Complete guest registration</li>
                    <li>• Provide required documentation</li>
                    <li>• Pay tourist tax (if applicable)</li>
                    {propertyHasNukiAccess && <li>• Receive digital access code</li>}
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Property Information:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Check-in: 3:00 PM onwards</li>
                    <li>• Check-out: 10:00 AM</li>
                    <li>• {propertyHasNukiAccess ? 'Smart lock access' : 'Traditional key pickup'}</li>
                    <li>• 24/7 support available</li>
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-center text-muted-foreground text-sm">
                  Complete check-in interface coming soon.
                  {propertyHasNukiAccess
                    ? ' Your access code will be sent automatically when ready.'
                    : ' Please contact us for check-in arrangements.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}