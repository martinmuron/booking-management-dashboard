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
import { Label } from "@/components/ui/label";

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
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastCheck, setLastCheck] = useState<string>(new Date().toISOString());
  const [timeFilter, setTimeFilter] = useState<'all' | 'past' | 'upcoming'>('all');

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

  const clearAndSyncWithHostAway = async () => {
    try {
      setRefreshing(true);
      const now = new Date();
      const augustFirst = `${now.getFullYear()}-08-01`;
      const response = await fetch(`/api/bookings/sync?clear=true&start=${augustFirst}`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        await fetchBookings();
        setLastCheck(new Date().toISOString());
      } else {
        setError(data.error || 'Clear + Sync failed');
      }
    } catch {
      setError('Network error: Unable to clear + sync bookings');
    } finally {
      setRefreshing(false);
    }
  };

  const importAllBookings = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/bookings/sync?all=true', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        await fetchBookings();
        setLastCheck(new Date().toISOString());
      } else {
        setError(data.error || 'Import all failed');
      }
    } catch {
      setError('Network error: Unable to import all bookings');
    } finally {
      setRefreshing(false);
    }
  };

  const checkForNewBookings = async () => {
    try {
      const response = await fetch('/api/bookings/check-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastCheck })
      });
      const data = await response.json();
      if (data.success && data.hasNewBookings) {
        await fetchBookings();
        setLastCheck(data.checkTime);
        console.log(`🔄 Found ${data.data.newBookings} new bookings, ${data.data.updatedBookings} updated`);
      }
    } catch (error) {
      console.error('Error checking for new bookings:', error);
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

  // Apply filters
  const filteredBookings = sortedBookings.filter(booking => {
    const checkInDate = new Date(booking.checkInDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Time filter (past/upcoming)
    if (timeFilter === 'past' && checkInDate >= today) return false;
    if (timeFilter === 'upcoming' && checkInDate < today) return false;
    
    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (checkInDate < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      // include the end date day
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      if (checkInDate > end) return false;
    }
    return true;
  });

  useEffect(() => {
    fetchBookings();
  }, []);

  // Auto-refresh effect to check for new bookings every 2 minutes
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      checkForNewBookings();
    }, 120000); // Check every 2 minutes

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, lastCheck, checkForNewBookings]);

  const totalBookings = filteredBookings.length;
  const pendingBookings = filteredBookings.filter(b => b.status === "PENDING").length;
  const checkedInBookings = filteredBookings.filter(b => b.status === "CHECKED_IN").length;
  const completedBookings = filteredBookings.filter(b => b.status === "COMPLETED").length;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl w-full mx-auto">
          {/* Header */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 md:gap-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">
                Manage all bookings and guest information
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-2 mt-4 md:mt-0 md:items-center flex-wrap hidden">
                            <div className="flex items-center gap-2 flex-wrap"> 
                <Button
                  variant={timeFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeFilter('all')}
                  className="h-8"
                >
                  All
                </Button>
                <Button
                  variant={timeFilter === 'past' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeFilter('past')}
                  className="h-8"
                >
                  Past
                </Button>
                <Button
                  variant={timeFilter === 'upcoming' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeFilter('upcoming')}
                  className="h-8"
                >
                  Upcoming
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-xs text-muted-foreground">Check-in from</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-[160px]" />
                <Label className="text-xs text-muted-foreground">to</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-[160px]" />
                {(dateFrom || dateTo || timeFilter !== 'all') && (
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => { setDateFrom(''); setDateTo(''); setTimeFilter('all'); }}>Clear All</Button>
                )}
              </div>
              <Button 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Syncing...' : 'Sync with HostAway'}
              </Button>
              <Button 
                onClick={importAllBookings}
                variant="secondary"
                disabled={refreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Importing...' : 'Import All'}
              </Button>
              <Button 
                onClick={clearAndSyncWithHostAway}
                variant="destructive"
                disabled={refreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Clearing...' : 'Clear + Sync'}
              </Button>
              <Button
                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                variant={autoRefreshEnabled ? "default" : "outline"}
                size="sm"
              >
                {autoRefreshEnabled ? '🟢 Auto-refresh ON' : '⭕ Auto-refresh OFF'}
              </Button>
              <Button
                onClick={() => router.push('/admin/settings')}
                variant="outline"
              >
                Settings
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

          {/* Bookings Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">HostAway Reservations</CardTitle>
              <CardDescription>
                Database bookings synced from HostAway (Status managed by your platform)
              </CardDescription>
            </CardHeader>
            <CardContent>
                             <div className="mb-4">
                 <div className="flex flex-col md:flex-row gap-3 md:gap-4 flex-wrap md:items-center">
                   <div className="flex items-center gap-2 flex-wrap">
                     <Button
                       variant={timeFilter === 'all' ? 'default' : 'outline'}
                       size="sm"
                       onClick={() => setTimeFilter('all')}
                       className="h-8"
                     >
                       All
                     </Button>
                     <Button
                       variant={timeFilter === 'past' ? 'default' : 'outline'}
                       size="sm"
                       onClick={() => setTimeFilter('past')}
                       className="h-8"
                     >
                       Past
                     </Button>
                     <Button
                       variant={timeFilter === 'upcoming' ? 'default' : 'outline'}
                       size="sm"
                       onClick={() => setTimeFilter('upcoming')}
                       className="h-8"
                     >
                       Upcoming
                     </Button>
                   </div>
                   <div className="flex items-center gap-2 flex-wrap">
                     <Label className="text-xs text-muted-foreground">Check-in from</Label>
                     <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-[160px]" />
                     <Label className="text-xs text-muted-foreground">to</Label>
                     <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-[160px]" />
                     {(dateFrom || dateTo || timeFilter !== 'all') && (
                       <Button variant="ghost" size="sm" className="h-8" onClick={() => { setDateFrom(''); setDateTo(''); setTimeFilter('all'); }}>Clear All</Button>
                     )}
                   </div>
                 </div>
               </div>
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
                <div className="rounded-md border overflow-x-auto md:overflow-x-visible">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none w-[16%] sm:w-[18%]"
                          onClick={() => handleSort('propertyName')}
                        >
                          <div className="flex items-center gap-1 text-xs">
                            Property
                            {React.createElement(getSortIcon('propertyName'), { className: "h-3 w-3" })}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none w-[14%] sm:w-[15%]"
                          onClick={() => handleSort('guestLeaderName')}
                        >
                          <div className="flex items-center gap-1 text-xs">
                            Guest
                            {React.createElement(getSortIcon('guestLeaderName'), { className: "h-3 w-3" })}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none w-[11%] sm:w-[12%]"
                          onClick={() => handleSort('checkInDate')}
                        >
                          <div className="flex items-center gap-1 text-xs">
                            Check-in
                            {React.createElement(getSortIcon('checkInDate'), { className: "h-3 w-3" })}
                          </div>
                        </TableHead>
                        <TableHead className="w-[8%] text-xs hidden md:table-cell">Guests</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none w-[18%] sm:w-[20%]"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center gap-1 text-xs">
                            Status
                            {React.createElement(getSortIcon('status'), { className: "h-3 w-3" })}
                          </div>
                        </TableHead>
                        <TableHead className="w-[12%] text-xs hidden lg:table-cell">Check-in Link</TableHead>
                        <TableHead className="text-right w-[14%] text-xs sm:w-[15%]">Manage</TableHead>
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
                            <TableCell className="text-center hidden md:table-cell">
                              <div className="flex items-center justify-center">
                                <Users className="mr-1 h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{booking.numberOfGuests}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 min-w-0">
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
                            <TableCell className="hidden lg:table-cell">
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
                              <div className="flex items-center justify-end">
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/admin/booking/${encodeURIComponent(booking.id)}`);
                                  }}
                                  className="h-7 w-7"
                                  title="Manage booking"
                                  aria-label="Manage booking"
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