"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  Users, 
  CreditCard, 
  Key, 
  BookOpen, 
  MapPin, 
  Clock,
  User,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
}

interface BookingData {
  id: string;
  propertyName: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  guestLeaderName: string;
  cityTaxAmount: number;
  cityTaxPerPerson: number;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function CheckInPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Mock booking data - will be replaced with API call
  useEffect(() => {
    const fetchBooking = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockBooking: BookingData = {
          id: bookingId,
          propertyName: "Downtown Loft",
          checkInDate: "2024-08-10T15:00:00Z",
          checkOutDate: "2024-08-15T11:00:00Z",
          numberOfGuests: 3,
          guestLeaderName: "John Smith",
          cityTaxAmount: 15.00,
          cityTaxPerPerson: 5.00
        };

        setBooking(mockBooking);
        
        // Initialize with one guest (the lead guest)
        setGuests([{
          id: '1',
          firstName: 'John',
          lastName: 'Smith',
          email: '',
          phone: '',
          dateOfBirth: '',
          nationality: ''
        }]);

        setLoading(false);
      } catch (err) {
        setError('Failed to load booking information');
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  const addGuest = () => {
    const newGuest: Guest = {
      id: Date.now().toString(),
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      nationality: ''
    };
    setGuests([...guests, newGuest]);
  };

  const removeGuest = (guestId: string) => {
    if (guests.length > 1) {
      setGuests(guests.filter(g => g.id !== guestId));
    }
  };

  const updateGuest = (guestId: string, field: keyof Guest, value: string) => {
    setGuests(guests.map(guest => 
      guest.id === guestId ? { ...guest, [field]: value } : guest
    ));
  };

  const handlePayment = async () => {
    // Placeholder for Stripe integration
    setSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setPaymentCompleted(true);
    } catch (err) {
      setError('Payment failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!paymentCompleted) {
      setError('Please complete payment before submitting');
      return;
    }

    setSubmitting(true);
    try {
      // Submit guest registration and complete check-in
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Check-in completed successfully!');
    } catch (err) {
      setError('Failed to complete check-in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Loading your booking...</span>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!booking) return null;

  const nights = Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Complete Your Check-in
            </h1>
            <p className="text-muted-foreground">
              Please provide the required information to complete your stay
            </p>
          </div>

          {error && (
            <Card className="mb-6 border-red-200">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Booking Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Booking Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{booking.propertyName}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="mr-2 h-4 w-4" />
                      Check-in: {formatDate(booking.checkInDate)} at {formatTime(booking.checkInDate)}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="mr-2 h-4 w-4" />
                      Check-out: {formatDate(booking.checkOutDate)} at {formatTime(booking.checkOutDate)}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-2 h-4 w-4" />
                      {nights} {nights === 1 ? 'night' : 'nights'}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center mb-2">
                    <Users className="mr-2 h-4 w-4" />
                    <span className="font-medium">{booking.numberOfGuests} Guests</span>
                  </div>
                  <Badge variant="outline">Booking ID: {booking.id}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guest Registration */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Guest Registration
              </CardTitle>
              <CardDescription>
                Please provide information for all guests (required by local regulations)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {guests.map((guest, index) => (
                  <div key={guest.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">
                        Guest {index + 1} {index === 0 && "(Lead Guest)"}
                      </h4>
                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeGuest(guest.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`firstName-${guest.id}`}>First Name *</Label>
                        <Input
                          id={`firstName-${guest.id}`}
                          value={guest.firstName}
                          onChange={(e) => updateGuest(guest.id, 'firstName', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`lastName-${guest.id}`}>Last Name *</Label>
                        <Input
                          id={`lastName-${guest.id}`}
                          value={guest.lastName}
                          onChange={(e) => updateGuest(guest.id, 'lastName', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`email-${guest.id}`}>Email</Label>
                        <Input
                          id={`email-${guest.id}`}
                          type="email"
                          value={guest.email}
                          onChange={(e) => updateGuest(guest.id, 'email', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`phone-${guest.id}`}>Phone</Label>
                        <Input
                          id={`phone-${guest.id}`}
                          value={guest.phone}
                          onChange={(e) => updateGuest(guest.id, 'phone', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`dob-${guest.id}`}>Date of Birth *</Label>
                        <Input
                          id={`dob-${guest.id}`}
                          type="date"
                          value={guest.dateOfBirth}
                          onChange={(e) => updateGuest(guest.id, 'dateOfBirth', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`nationality-${guest.id}`}>Nationality *</Label>
                        <Select
                          value={guest.nationality}
                          onValueChange={(value) => updateGuest(guest.id, 'nationality', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select nationality" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="US">United States</SelectItem>
                            <SelectItem value="UK">United Kingdom</SelectItem>
                            <SelectItem value="DE">Germany</SelectItem>
                            <SelectItem value="FR">France</SelectItem>
                            <SelectItem value="IT">Italy</SelectItem>
                            <SelectItem value="ES">Spain</SelectItem>
                            <SelectItem value="NL">Netherlands</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
                
                {guests.length < booking.numberOfGuests && (
                  <Button
                    variant="outline"
                    onClick={addGuest}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Another Guest
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* City Tax Payment */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                City Tax Payment
              </CardTitle>
              <CardDescription>
                Tourist tax payment required by local regulations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span>City Tax ({guests.length} guests × €{booking.cityTaxPerPerson})</span>
                    <span className="font-semibold">€{(guests.length * booking.cityTaxPerPerson).toFixed(2)}</span>
                  </div>
                </div>
                
                {paymentCompleted ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Payment completed successfully
                  </div>
                ) : (
                  <Button 
                    onClick={handlePayment}
                    disabled={submitting}
                    className="w-full"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay City Tax (€{(guests.length * booking.cityTaxPerPerson).toFixed(2)})
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Guidebooks & Guest Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="mr-2 h-5 w-5" />
                Guest Information & Guidebooks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Welcome to {booking.propertyName}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your digital guidebook will be available here with local recommendations, 
                    property information, and important contacts.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-background p-3 rounded border">
                      <h5 className="font-medium text-sm">Local Attractions</h5>
                      <p className="text-xs text-muted-foreground">Coming soon...</p>
                    </div>
                    <div className="bg-background p-3 rounded border">
                      <h5 className="font-medium text-sm">Restaurants</h5>
                      <p className="text-xs text-muted-foreground">Coming soon...</p>
                    </div>
                    <div className="bg-background p-3 rounded border">
                      <h5 className="font-medium text-sm">Emergency Contacts</h5>
                      <p className="text-xs text-muted-foreground">Coming soon...</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Virtual Keys */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="mr-2 h-5 w-5" />
                Virtual Keys (NUKI)
              </CardTitle>
              <CardDescription>
                Your digital keys will be generated after check-in completion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg text-center">
                <Key className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <h4 className="font-medium mb-2">Digital Keys Not Yet Available</h4>
                <p className="text-sm text-muted-foreground">
                  Your NUKI virtual keys will be automatically generated and sent to your email 
                  once you complete the check-in process and payment.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={handleSubmit}
                disabled={!paymentCompleted || submitting}
                className="w-full"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Completing Check-in...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Complete Check-in
                  </>
                )}
              </Button>
              
              {!paymentCompleted && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Please complete the city tax payment to proceed
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}