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
  ChevronRight
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

        {/* TODO: Add the rest of the check-in flow components here */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Check-in interface is being updated for better sharing experience.
              <br />
              Please use the admin panel for now.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}