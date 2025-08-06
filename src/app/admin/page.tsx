"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React from 'react';
import { Search, Calendar, Users, Home, RefreshCw, Loader2, AlertCircle, ExternalLink, Copy, Check, ArrowUpDown, ArrowUp, ArrowDown, Clock, CreditCard, KeyRound, CheckCircle2, AlertTriangle } from "lucide-react";
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

const getStatusInfo = (status?: string) => {
  if (!status) {
    return {
      color: "bg-gray-100 text-gray-800 hover:bg-gray-100",
      icon: AlertTriangle,
      text: "Unknown",
      description: "Status unknown"
    };
  }
  
  switch (status.toLowerCase()) {
    case "confirmed":
      return {
        color: "bg-blue-100 text-blue-800 hover:bg-blue-100",
        icon: Calendar,
        text: "Confirmed",
        description: "Booking confirmed, awaiting check-in"
      };
    case "pending":
      return {
        color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
        icon: Clock,
        text: "Pending Check-in",
        description: "Needs guest registration & city tax payment"
      };
    case "payment_pending":
      return {
        color: "bg-orange-100 text-orange-800 hover:bg-orange-100",
        icon: CreditCard,
        text: "Payment Pending",
        description: "City tax payment required"
      };
    case "checked_in":
    case "checkedin":
      return {
        color: "bg-green-100 text-green-800 hover:bg-green-100",
        icon: CheckCircle2,
        text: "Checked In",
        description: "Guest registered and city tax paid"
      };
    case "keys_distributed":
      return {
        color: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
        icon: KeyRound,
        text: "Keys Sent",
        description: "Virtual keys distributed"
      };
    case "completed":
      return {
        color: "bg-green-200 text-green-900 hover:bg-green-200",
        icon: CheckCircle2,
        text: "Completed",
        description: "Stay completed successfully"
      };
    case "cancelled":
    case "canceled":
      return {
        color: "bg-red-100 text-red-800 hover:bg-red-100",
        icon: AlertTriangle,
        text: "Cancelled",
        description: "Booking cancelled"
      };
    default:
      return {
        color: "bg-gray-100 text-gray-800 hover:bg-gray-100",
        icon: AlertTriangle,
        text: status.replace('_', ' '),
        description: "Custom status"
      };
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
  const [copiedLinks, setCopiedLinks] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<'checkInDate' | 'propertyName' | 'guestLeaderName' | 'status'>('checkInDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  const copyCheckInLink = async (bookingId: string, checkInToken: string) => {
    const checkInUrl = `${window.location.origin}/checkin/${checkInToken}`;
    
    try {
      await navigator.clipboard.writeText(checkInUrl);
      setCopiedLinks(prev => ({ ...prev, [bookingId]: true }));
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedLinks(prev => ({ ...prev, [bookingId]: false }));
      }, 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = checkInUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopiedLinks(prev => ({ ...prev, [bookingId]: true }));
      setTimeout(() => {
        setCopiedLinks(prev => ({ ...prev, [bookingId]: false }));
      }, 2000);
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: typeof sortField) => {
    if (field !== sortField) return ArrowUpDown;
    return sortDirection === 'asc' ? ArrowUp : ArrowDown;
  };

  const sortedBookings = [...bookings].sort((a, b) => {
    let aVal: string | Date;
    let bVal: string | Date;

    switch (sortField) {
      case 'checkInDate':
        aVal = new Date(a.checkInDate);
        bVal = new Date(b.checkInDate);
        break;
      case 'propertyName':
        aVal = a.propertyName.toLowerCase();
        bVal = b.propertyName.toLowerCase();
        break;
      case 'guestLeaderName':
        aVal = a.guestLeaderName.toLowerCase();
        bVal = b.guestLeaderName.toLowerCase();
        break;
      case 'status':
        aVal = a.status.toLowerCase();
        bVal = b.status.toLowerCase();
        break;
      default:
        aVal = a.checkInDate;
        bVal = b.checkInDate;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Filter out very old bookings (before 2024) - likely test data
  const filteredBookings = sortedBookings.filter(booking => {
    const checkInDate = new Date(booking.checkInDate);
    return checkInDate.getFullYear() >= 2024;
  });

  useEffect(() => {
    fetchBookings();
  }, []);

  const totalBookings = filteredBookings.length;
  const pendingBookings = filteredBookings.filter(b => b.status === "PENDING").length;
  const checkedInBookings = filteredBookings.filter(b => b.status === "CHECKED_IN").length;
  const completedBookings = filteredBookings.filter(b => b.status === "COMPLETED").length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="w-[90%] mx-auto">
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
              ) : filteredBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No reservations found
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none w-[18%]"
                          onClick={() => handleSort('propertyName')}
                        >
                          <div className="flex items-center gap-1 text-xs">
                            Property
                            {React.createElement(getSortIcon('propertyName'), { className: "h-3 w-3" })}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none w-[15%]"
                          onClick={() => handleSort('guestLeaderName')}
                        >
                          <div className="flex items-center gap-1 text-xs">
                            Guest
                            {React.createElement(getSortIcon('guestLeaderName'), { className: "h-3 w-3" })}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none w-[12%]"
                          onClick={() => handleSort('checkInDate')}
                        >
                          <div className="flex items-center gap-1 text-xs">
                            Check-in
                            {React.createElement(getSortIcon('checkInDate'), { className: "h-3 w-3" })}
                          </div>
                        </TableHead>
                        <TableHead className="w-[8%] text-xs">Guests</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none w-[20%]"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center gap-1 text-xs">
                            Status
                            {React.createElement(getSortIcon('status'), { className: "h-3 w-3" })}
                          </div>
                        </TableHead>
                        <TableHead className="w-[12%] text-xs">Check-in Link</TableHead>
                        <TableHead className="text-right w-[15%] text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((booking) => {
                        const statusInfo = getStatusInfo(booking.status);
                        const StatusIcon = statusInfo.icon;
                        
                        return (
                          <TableRow 
                            key={booking.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => router.push(`/admin/booking/${booking.id}`)}
                          >
                            <TableCell className="font-medium text-sm max-w-0 truncate" title={booking.propertyName}>
                              {booking.propertyName}
                            </TableCell>
                            <TableCell className="text-sm max-w-0 truncate" title={booking.guestLeaderName}>
                              {booking.guestLeaderName}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {formatDate(booking.checkInDate)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center">
                                <Users className="mr-1 h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{booking.numberOfGuests}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <StatusIcon className="h-3 w-3 flex-shrink-0" />
                                <div className="flex flex-col min-w-0">
                                  <Badge className={`${statusInfo.color} text-xs px-1 py-0`}>
                                    {statusInfo.text}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground mt-1 truncate">
                                    {statusInfo.description}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyCheckInLink(booking.id, booking.checkInToken);
                                }}
                                className="h-7 px-2 text-xs"
                              >
                                {copiedLinks[booking.id] ? (
                                  <>
                                    <Check className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">Copy</span>
                                  </>
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/admin/booking/${booking.id}`);
                                  }}
                                  className="h-7 px-2 text-xs"
                                >
                                  Manage
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`/checkin/${booking.checkInToken}`, '_blank');
                                  }}
                                  className="h-7 px-2"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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