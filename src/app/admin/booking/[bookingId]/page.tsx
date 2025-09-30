"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { hasNukiAccessByListingId } from "@/utils/nuki-properties-mapping";
import { AdminNav } from "@/components/admin/AdminNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users,
  MapPin,
  Mail,
  CreditCard,
  Key,
  Edit,
  Save,
  X,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  UserCheck,
  Calendar,
  Download
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

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed';
  stripePaymentIntentId?: string;
  createdAt: string;
}

interface VirtualKey {
  id: string;
  keyType: string;
  nukiKeyId: string;
  isActive: boolean;
  createdAt: string;
  deactivatedAt?: string;
}

interface ExistingKeySummary {
  id: string;
  code: string;
  device: string;
  keyType: string;
  name: string;
  isActive: boolean;
  allowedFromDate?: string | null;
  allowedUntilDate?: string | null;
  matchedGuest?: string;
}

interface ExistingKeysState {
  hasKeys: boolean;
  totalKeys: number;
  universalKeypadCode: string | null;
  existingKeys: ExistingKeySummary[];
  queuedKeyTypes: string[];
  booking?: {
    isAuthorized?: boolean;
  };
}

interface ExistingKeysApiResponse {
  success: boolean;
  data?: {
    hasKeys: boolean;
    existingKeys?: ExistingKeySummary[];
    universalKeypadCode?: string | null;
    totalKeys?: number;
    queuedKeyTypes?: string[];
    booking?: {
      isAuthorized?: boolean;
    };
  };
}

interface BookingData {
  id: string;
  hostAwayId: string;
  propertyName: string;
  propertyAddress?: string;
  listingId?: number;
  guestLeaderName: string;
  guestLeaderEmail: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  roomNumber?: string;
  status: string;
  checkInToken: string;
  universalKeypadCode?: string;
  createdAt: string;
  updatedAt: string;
  guests?: Guest[];
  payments?: Payment[];
  virtualKeys?: VirtualKey[];
}

/**
 * Check if a booking has Nuki access based on address (same logic as backend and frontend)
 * @param booking - The booking data
 * @returns true if property should have Nuki access
 */
const bookingHasNukiAccess = (booking?: BookingData | null): boolean => {
  if (!booking?.listingId) {
    return false;
  }

  return hasNukiAccessByListingId(booking.listingId);
};

const getStatusColor = (status?: string) => {
  if (!status) return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  
  switch (status.toLowerCase()) {
    case "confirmed":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "pending":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    case "checked-in":
    case "checkedin":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "cancelled":
    case "canceled":
      return "bg-red-100 text-red-800 hover:bg-red-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
};

const pad = (value: number) => value.toString().padStart(2, '0');

const getPragueOffset = (date: Date) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Prague',
    hour12: false,
    timeZoneName: 'short'
  });

  const tzName = formatter
    .formatToParts(date)
    .find(part => part.type === 'timeZoneName')?.value ?? 'GMT+00';

  const match = tzName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/i);

  if (!match) {
    return '+00:00';
  }

  const sign = match[1] ?? '+';
  const hours = pad(Number.parseInt(match[2] ?? '0', 10));
  const minutes = pad(Number.parseInt(match[3] ?? '0', 10));

  return `${sign}${hours}:${minutes}`;
};

const toPragueDateTime = (dateString: string, hours: number, minutes: number) => {
  const baseDate = new Date(dateString);
  if (Number.isNaN(baseDate.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(baseDate);
  const year = parts.find(part => part.type === 'year')?.value ?? '1970';
  const month = parts.find(part => part.type === 'month')?.value ?? '01';
  const day = parts.find(part => part.type === 'day')?.value ?? '01';
  const offset = getPragueOffset(baseDate);

  return new Date(`${year}-${month}-${day}T${pad(hours)}:${pad(minutes)}:00${offset}`);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Europe/Prague'
  });
};

const formatTime = (dateString: string, override?: { hour: number; minute: number }) => {
  const target = override
    ? toPragueDateTime(dateString, override.hour, override.minute)
    : new Date(dateString);

  if (!target || Number.isNaN(target.getTime())) {
    return '—';
  }

  return target.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Prague'
  });
};

const calculateNights = (checkInDate: string, checkOutDate: string) => {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    return 0;
  }

  const checkInMidnightUtc = Date.UTC(
    checkIn.getUTCFullYear(),
    checkIn.getUTCMonth(),
    checkIn.getUTCDate()
  );
  const checkOutMidnightUtc = Date.UTC(
    checkOut.getUTCFullYear(),
    checkOut.getUTCMonth(),
    checkOut.getUTCDate()
  );

  const diffDays = Math.floor((checkOutMidnightUtc - checkInMidnightUtc) / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 0);
};

const calculateCheckInProgress = (booking: BookingData) => {
  const totalGuests = booking.numberOfGuests;
  const registeredGuests = booking.guests?.length || 0;
  const hasPaid = booking.payments?.some(p => p.status === 'paid') || false;
  
  const steps = [
    { 
      id: 'booking_confirmed', 
      label: 'Booking Confirmed', 
      completed: booking.status !== 'PENDING',
      icon: CheckCircle2 
    },
    { 
      id: 'guests_registered', 
      label: `Guest Registration (${registeredGuests}/${totalGuests})`, 
      completed: registeredGuests === totalGuests,
      icon: UserCheck 
    },
    { 
      id: 'tax_paid', 
      label: 'Tourist Tax Paid', 
      completed: hasPaid,
      icon: DollarSign 
    },
    { 
      id: 'checked_in', 
      label: 'Checked In', 
      completed: ['CHECKED_IN', 'KEYS_DISTRIBUTED', 'COMPLETED'].includes(booking.status),
      icon: Key 
    }
  ];
  
  const completedSteps = steps.filter(step => step.completed).length;
  const progressPercent = (completedSteps / steps.length) * 100;
  
  return { steps, completedSteps, totalSteps: steps.length, progressPercent };
};

const calculateTouristTax = (booking: BookingData) => {
  if (!booking.guests) return { total: 0, breakdown: 'No guests registered yet' };
  
  const nights = calculateNights(booking.checkInDate, booking.checkOutDate);
  const adultGuests = booking.guests.filter(guest => {
    if (!guest.dateOfBirth) return true; // Assume adult if no birth date
    const age = new Date().getFullYear() - new Date(guest.dateOfBirth).getFullYear();
    return age >= 18;
  }).length;
  
  const taxPerPersonPerNight = 50; // CZK
  const total = adultGuests * nights * taxPerPersonPerNight;
  
  return {
    total,
    breakdown: `${adultGuests} adults × ${nights} nights × ${taxPerPersonPerNight} CZK = ${total} CZK`
  };
};

export default function BookingAdminPage() {
  useAuth(); // Protect this page
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [generatingKeys, setGeneratingKeys] = useState(false);
  const [existingKeys, setExistingKeys] = useState<ExistingKeysState>({
    hasKeys: false,
    existingKeys: [],
    universalKeypadCode: null,
    totalKeys: 0,
    queuedKeyTypes: [],
  });
  const [exportingGuests, setExportingGuests] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        setError('No booking ID provided');
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/bookings/${bookingId}`);
        const data = await response.json();
        
        if (data.success) {
          setBooking(data.data);
          setNewStatus(data.data.status);

          // Fetch existing NUKI keys
          await refreshExistingKeys(bookingId);
        } else {
          setError(data.error || 'Failed to fetch booking');
          console.error('Failed to fetch booking:', data);
        }
      } catch (err) {
        setError('Network error: Unable to fetch booking');
        console.error('Error fetching booking:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  const refreshExistingKeys = async (id: string) => {
    try {
      const keysResponse = await fetch(`/api/bookings/${id}/existing-keys`);
      const keysData: ExistingKeysApiResponse = await keysResponse.json();
      if (keysData.success && keysData.data) {
        const {
          hasKeys,
          existingKeys: fetchedKeys = [],
          universalKeypadCode = null,
          totalKeys = fetchedKeys.length,
          queuedKeyTypes = [],
          booking: keysBooking,
        } = keysData.data;

        setExistingKeys({
          hasKeys,
          existingKeys: fetchedKeys,
          universalKeypadCode,
          totalKeys,
          queuedKeyTypes,
          booking: keysBooking,
        });
      }
    } catch (err) {
      console.error('Error fetching existing keys:', err);
    }
  };

  const updateBookingStatus = async () => {
    if (!booking) return;
    
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setBooking({ ...booking, status: newStatus });
        setEditingStatus(false);
      } else {
        setError(data.error || 'Failed to update status');
      }
    } catch {
      setError('Network error: Unable to update status');
    }
  };

  const generateVirtualKeys = async () => {
    if (!booking) return;

    setGeneratingKeys(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch('/api/virtual-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.data?.queuedKeyTypes?.length) {
          setNotice(`Some keys are queued for retry (${data.data.queuedKeyTypes.join(', ')}). We'll retry every 15 minutes.`);
        } else if (data.message) {
          setNotice(data.message);
        } else {
          setNotice('Virtual keys updated successfully.');
        }

        // Refresh booking data to show the new keys
        const bookingResponse = await fetch(`/api/bookings/${bookingId}`);
        const bookingData = await bookingResponse.json();

        if (bookingData.success) {
          setBooking(bookingData.data);
        }

        await refreshExistingKeys(booking.id);
      } else {
        setError(data.error || 'Failed to generate virtual keys');
      }
    } catch (err) {
      setError('Network error: Unable to generate virtual keys');
      console.error('Error generating virtual keys:', err);
    } finally {
      setGeneratingKeys(false);
    }
  };

  const exportUbyPortGuests = async () => {
    if (!booking) {
      return;
    }

    setExportingGuests(true);
    setError(null);

    try {
      const response = await fetch(`/api/bookings/${booking.id}/ubyport-export`);

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error || 'Failed to export guest information');
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `ubyport_${booking.id}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setNotice('Guest registration exported for UbyPort.');
    } catch (exportError) {
      console.error('Failed to export UbyPort guest data:', exportError);
      setError('Failed to export guest information');
    } finally {
      setExportingGuests(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <div className="flex items-center justify-center px-4 py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span>Loading booking details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <div className="flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
              <Button 
                onClick={() => router.push('/admin')}
                className="w-full mt-4"
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const nights = calculateNights(booking.checkInDate, booking.checkOutDate);
  const checkInUrl = `${window.location.origin}/checkin/${booking.checkInToken}`;
  const progress = calculateCheckInProgress(booking);
  const touristTax = calculateTouristTax(booking);
  const leadGuestEmail = booking.guestLeaderEmail;
  const checkedInGuests = booking.guests || [];
  const fallbackGuestEmail = checkedInGuests.find((guest) => guest.email)?.email || null;
  const contactEmail = leadGuestEmail || fallbackGuestEmail;
  const propertyHasNuki = existingKeys.booking?.isAuthorized ?? bookingHasNukiAccess(booking);

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="container mx-auto px-4 py-8">
        <div className="w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Booking Management
              </h1>
              <p className="text-muted-foreground">
                {booking.propertyName} • {booking.guestLeaderName}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => window.open(checkInUrl, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Check-in Page
              </Button>
            </div>
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

          {notice && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardContent className="pt-6 text-blue-800 text-sm">
                {notice}
              </CardContent>
            </Card>
          )}

          {/* Check-in Progress */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Check-in Progress
                  </CardTitle>
                  <CardDescription>
                    {progress.completedSteps} of {progress.totalSteps} steps completed ({Math.round(progress.progressPercent)}%)
                  </CardDescription>
                </div>
                <Badge 
                  className={progress.progressPercent === 100 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                >
                  {progress.progressPercent === 100 ? 'Complete' : 'In Progress'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress.progressPercent}%` }}
                ></div>
              </div>
              
              {/* Progress Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {progress.steps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.id} className="flex items-center space-x-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        step.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${step.completed ? 'text-green-900' : 'text-gray-900'}`}>
                          {step.label}
                        </p>
                      </div>
                      {step.completed && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* Main Booking Info */}
            <div className="space-y-6">
              {/* Checked-in Guests Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Checked-in Guests
                  </CardTitle>
                  <CardDescription>
                    {checkedInGuests.length ? `${checkedInGuests.length} guest(s) registered` : 'No guests have completed online check-in yet'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {checkedInGuests.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Nationality</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {checkedInGuests.map(g => (
                          <TableRow key={g.id}>
                            <TableCell className="font-medium">{g.firstName} {g.lastName}</TableCell>
                            <TableCell>{g.email || '-'}</TableCell>
                            <TableCell>{g.phone || '-'}</TableCell>
                            <TableCell>{g.nationality || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-sm text-muted-foreground">Guests appear here after completing online check-in.</div>
                  )}
                </CardContent>
              </Card>
              {/* Booking Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="mr-2 h-5 w-5" />
                    Booking Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Property</Label>
                        <p className="font-semibold">{booking.propertyName}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Guest Leader</Label>
                        <p className="font-medium">{booking.guestLeaderName}</p>
                        <p className="text-sm text-muted-foreground">{booking.guestLeaderEmail}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Booking Status</Label>
                        <div className="flex items-center gap-2 mt-1">
                          {editingStatus ? (
                            <div className="flex items-center gap-2">
                              <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PENDING">Pending</SelectItem>
                                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                                  <SelectItem value="CHECKED_IN">Checked In</SelectItem>
                                  <SelectItem value="COMPLETED">Completed</SelectItem>
                                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button size="sm" onClick={updateBookingStatus}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => {
                                  setEditingStatus(false);
                                  setNewStatus(booking.status);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(booking.status.toLowerCase())}>
                                {booking.status.replace('_', ' ')}
                              </Badge>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => setEditingStatus(true)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Check-in</Label>
                        <p className="font-medium">{formatDate(booking.checkInDate)}</p>
                        <p className="text-sm text-muted-foreground">{formatTime(booking.checkInDate, { hour: 15, minute: 0 })}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Check-out</Label>
                        <p className="font-medium">{formatDate(booking.checkOutDate)}</p>
                        <p className="text-sm text-muted-foreground">{formatTime(booking.checkOutDate, { hour: 10, minute: 0 })}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Duration</Label>
                        <p className="font-medium">{nights} {nights === 1 ? 'night' : 'nights'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Guests</Label>
                        <p className="font-medium">{booking.numberOfGuests} guests</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Guests */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Guest Information
                  </CardTitle>
                  <CardDescription>
                    {booking.guests?.length ? `${booking.guests.length} guests registered` : 'No guest information available yet'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {booking.guests && booking.guests.length > 0 ? (
                    <div className="space-y-4">
                      {booking.guests.map((guest, index) => (
                        <div key={guest.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">
                              Guest {index + 1} {index === 0 && "(Lead Guest)"}
                            </h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <Label className="text-muted-foreground">Full Name</Label>
                              <p className="font-medium">{guest.firstName} {guest.lastName}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Email</Label>
                              <p className="font-medium">{guest.email || 'Not provided'}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Phone</Label>
                              <p className="font-medium">{guest.phone || 'Not provided'}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Date of Birth</Label>
                              <p className="font-medium">{guest.dateOfBirth ? formatDate(guest.dateOfBirth) : 'Not provided'}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Nationality</Label>
                              <p className="font-medium">{guest.nationality || 'Not provided'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="mx-auto h-12 w-12 mb-3 opacity-50" />
                      <p>No guest information has been submitted yet.</p>
                      <p className="text-sm">Guests will need to complete the check-in form.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Payments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {booking.payments && booking.payments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment ID</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {booking.payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">
                              {payment.amount} {payment.currency.toUpperCase()}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={
                                  payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                                  payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }
                              >
                                {payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {payment.stripePaymentIntentId || payment.id}
                            </TableCell>
                            <TableCell>
                              {formatDate(payment.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="mx-auto h-12 w-12 mb-3 opacity-50" />
                      <p>No payments have been processed yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Online Check-in */}
              <Card>
                <CardHeader>
                  <CardTitle>Online Check-in</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">Lead Guest Email</Label>
                    <p className="font-medium break-all">{leadGuestEmail}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Check-in Link</Label>
                    <Input value={checkInUrl} readOnly className="font-mono text-xs" onClick={(e) => e.currentTarget.select()} />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" variant="outline" onClick={() => window.open(checkInUrl, '_blank')}>
                      <ExternalLink className="mr-2 h-4 w-4" /> Open Link
                    </Button>
                    <Button className="flex-1" variant="outline" onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(checkInUrl);
                      } catch {}
                    }}>
                      Copy Link
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Virtual Keys */}
              {propertyHasNuki && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Key className="mr-2 h-5 w-5" />
                    Virtual Keys
                  </CardTitle>
                  <CardDescription>
                    {(() => {
                      if (existingKeys.hasKeys) {
                        return existingKeys.universalKeypadCode
                          ? `Universal code: ${existingKeys.universalKeypadCode} (${existingKeys.totalKeys} keys active)`
                          : `${existingKeys.totalKeys} existing access keys found`;
                      }

                      return 'Checking for existing digital access keys...';
                    })()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    if (existingKeys.hasKeys) {
                      return (
                        <div className="space-y-4">
                          {existingKeys.universalKeypadCode && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-blue-900">Universal Keypad Code</Label>
                                  <p className="text-2xl font-bold text-blue-800 font-mono">{existingKeys.universalKeypadCode}</p>
                                  <p className="text-sm text-blue-600">Works on all {existingKeys.totalKeys} doors listed below</p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(existingKeys.universalKeypadCode ?? '');
                                    } catch (err) {
                                      console.error('Failed to copy keypad code', err);
                                    }
                                  }}
                                >
                                  Copy Code
                                </Button>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 gap-4">
                            {existingKeys.existingKeys.map((key) => (
                              <div key={key.id} className="border rounded-lg p-4 bg-muted/30">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Door</p>
                                    <p className="font-semibold text-base">{key.device}</p>
                                  </div>
                                  <Badge className={key.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}>
                                    {key.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>

                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Key Type</p>
                                    <p className="font-medium">{key.keyType}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Keypad Code</p>
                                    <p className="font-mono text-lg font-semibold">{key.code}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Matched Guest</p>
                                    <p className="font-medium">{key.matchedGuest || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Assigned Name (Nuki)</p>
                                    <p className="font-medium">{key.name}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Valid From</p>
                                    <p className="font-medium">{key.allowedFromDate ? new Date(key.allowedFromDate).toLocaleString() : '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Valid Until</p>
                                    <p className="font-medium">{key.allowedUntilDate ? new Date(key.allowedUntilDate).toLocaleString() : '—'}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {existingKeys.queuedKeyTypes?.length ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                              <div className="text-sm text-amber-800">
                                Waiting for NUKI capacity on: {existingKeys.queuedKeyTypes.join(', ')}. We&apos;ll retry automatically every 15 minutes.
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    }

                    return (
                    <div className="text-center py-8">
                      <Key className="mx-auto h-12 w-12 mb-3 opacity-50" />
                      <p className="text-muted-foreground mb-4">No existing NUKI keys found for this booking</p>
                      <p className="text-sm text-muted-foreground">
                        Keys may need to be created in NUKI app or dates may not match exactly.
                      </p>
                    </div>
                  );
                  })()}
                </CardContent>
              </Card>
              )}
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => window.open(checkInUrl, '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Check-in Page
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={generateVirtualKeys}
                    disabled={generatingKeys}
                  >
                    {generatingKeys ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Key className="mr-2 h-4 w-4" />
                    )}
                    {generatingKeys ? 'Generating...' : 'Generate Virtual Keys'}
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={exportUbyPortGuests}
                    disabled={exportingGuests || !(booking?.guests && booking.guests.length > 0)}
                  >
                    {exportingGuests ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {exportingGuests ? 'Preparing Export...' : 'Export Guest Info (UbyPort)'}
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => contactEmail && (window.location.href = `mailto:${contactEmail}`)}
                    disabled={!contactEmail}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    {contactEmail ? 'Send Email to Guest' : 'No Email Available'}
                  </Button>
                </CardContent>
              </Card>

              {/* Tourist Tax Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Tourist Tax
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">Calculated Amount</Label>
                    <p className="font-semibold text-lg">{touristTax.total} CZK</p>
                    <p className="text-xs text-muted-foreground">{touristTax.breakdown}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Payment Status</Label>
                    <div className="mt-1">
                      {booking.payments?.some(p => p.status === 'paid') ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Paid
                        </Badge>
                      ) : booking.payments?.some(p => p.status === 'pending') ? (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Unpaid
                        </Badge>
                      )}
                    </div>
                  </div>
                  {!booking.payments?.some(p => p.status === 'paid') && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground">
                        Guests will be prompted to pay during check-in
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Booking Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle>Booking Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">Booking ID</Label>
                    <p className="font-mono text-sm">{booking.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">HostAway ID</Label>
                    <p className="font-mono text-sm">{booking.hostAwayId}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Check-in Token</Label>
                    <p className="font-mono text-sm break-all">{booking.checkInToken}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Check-in URL</Label>
                    <Input 
                      value={checkInUrl}
                      readOnly
                      className="font-mono text-xs"
                      onClick={(e) => e.currentTarget.select()}
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Created</Label>
                    <p className="text-sm">{formatDate(booking.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Last Updated</Label>
                    <p className="text-sm">{formatDate(booking.updatedAt)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
