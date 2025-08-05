"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, Users, Home, RefreshCw, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface BookingData {
  id: string;
  hostAwayId: string;
  propertyName: string;
  guestLeaderName: string;
  guestLeaderEmail: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  status: string; // Our platform status
  checkInToken: string;
  createdAt: string;
  updatedAt: string;
}

const getStatusColor = (status?: string) => {
  if (!status) {
    return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
  
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
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export default function AdminDashboard() {
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings');
      const data = await response.json();
      
      if (data.success) {
        setBookings(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch bookings');
      }
    } catch {
      setError('Network error: Unable to fetch bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const syncWithHostAway = async () => {
    try {
      setRefreshing(true);
      
      const response = await fetch('/api/bookings/sync', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchBookings();
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch {
      setError('Network error: Unable to sync bookings');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await syncWithHostAway();
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter(b => b.status === "PENDING").length;
  const checkedInBookings = bookings.filter(b => b.status === "CHECKED_IN").length;
  const completedBookings = bookings.filter(b => b.status === "COMPLETED").length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">
                Manage all bookings and guest information
              </p>
            </div>
            <div className="flex gap-2 mt-4 md:mt-0">
              <Button 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Syncing...' : 'Sync with HostAway'}
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalBookings}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{completedBookings}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{pendingBookings}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Checked In</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{checkedInBookings}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Filters & Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search by guest name or property..."
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Booking Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="checked-in">Checked In</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    <SelectItem value="downtown-loft">Downtown Loft</SelectItem>
                    <SelectItem value="seaside-villa">Seaside Villa</SelectItem>
                    <SelectItem value="mountain-cabin">Mountain Cabin</SelectItem>
                    <SelectItem value="city-apartment">City Apartment</SelectItem>
                    <SelectItem value="riverside-cottage">Riverside Cottage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Bookings Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">HostAway Reservations</CardTitle>
              <CardDescription>
                Database bookings synced from HostAway (Status managed by your platform)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading reservations...</span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8 text-red-600">
                  <AlertCircle className="h-8 w-8" />
                  <span className="ml-2">{error}</span>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No reservations found
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property Name</TableHead>
                        <TableHead>Guest Leader Name</TableHead>
                        <TableHead>Check-in Date</TableHead>
                        <TableHead>Number of Guests</TableHead>
                        <TableHead>Booking Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => (
                        <TableRow 
                          key={booking.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => router.push(`/admin/booking/${booking.id}`)}
                        >
                          <TableCell className="font-medium">
                            {booking.propertyName}
                          </TableCell>
                          <TableCell>{booking.guestLeaderName}</TableCell>
                          <TableCell>{formatDate(booking.checkInDate)}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Users className="mr-1 h-4 w-4 text-muted-foreground" />
                              {booking.numberOfGuests}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(booking.status.toLowerCase())}>
                              {booking.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/admin/booking/${booking.id}`);
                                }}
                              >
                                Manage
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`/checkin/${booking.id}`, '_blank');
                                }}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}