"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Calendar, 
  Users, 
  MapPin, 
  Clock,
  User,
  Mail,
  Phone,
  CreditCard,
  Key,
  ArrowLeft,
  Edit,
  Save,
  X,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle
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

interface BookingData {
  id: string;
  hostAwayId: string;
  propertyName: string;
  guestLeaderName: string;
  guestLeaderEmail: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  status: string;
  checkInToken: string;
  createdAt: string;
  updatedAt: string;
  guests?: Guest[];
  payments?: Payment[];
}

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

export default function BookingAdminPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await fetch(`/api/bookings/${bookingId}`);
        const data = await response.json();
        
        if (data.success) {
          setBooking(data.data);
          setNewStatus(data.data.status);
        } else {
          setError(data.error || 'Failed to fetch booking');
        }
      } catch (err) {
        setError('Network error: Unable to fetch booking');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

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
    } catch (err) {
      setError('Network error: Unable to update status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Loading booking details...</span>
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
            <Button 
              onClick={() => router.push('/admin')}
              className="w-full mt-4"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!booking) return null;

  const nights = Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24));
  const checkInUrl = `${window.location.origin}/checkin/${booking.checkInToken}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => router.push('/admin')}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Booking Management
                </h1>
                <p className="text-muted-foreground">
                  {booking.propertyName} • {booking.guestLeaderName}
                </p>
              </div>
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Booking Info */}
            <div className="lg:col-span-2 space-y-6">
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
                        <p className="text-sm text-muted-foreground">{formatTime(booking.checkInDate)}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Check-out</Label>
                        <p className="font-medium">{formatDate(booking.checkOutDate)}</p>
                        <p className="text-sm text-muted-foreground">{formatTime(booking.checkOutDate)}</p>
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
                  <Button className="w-full" variant="outline">
                    <Key className="mr-2 h-4 w-4" />
                    Generate Virtual Keys
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Mail className="mr-2 h-4 w-4" />
                    Send Email to Guest
                  </Button>
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