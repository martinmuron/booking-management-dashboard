"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import React from 'react';
import { Search, Calendar, Users, Home, Loader2, AlertCircle, ExternalLink, Copy, Check, ArrowUpDown, ArrowUp, ArrowDown, Clock, CreditCard, KeyRound, CheckCircle2, AlertTriangle, X, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { AdminNav } from "@/components/admin/AdminNav";

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
  universalKeypadCode?: string;
  roomNumber?: string;
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
  useAuth(); // Protect this page
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLinks, setCopiedLinks] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<'checkInDate' | 'propertyName' | 'guestLeaderName' | 'status'>('checkInDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'past' | 'upcoming' | 'upcoming30' | 'inprogress'>('upcoming');
  const [hideCancelled, setHideCancelled] = useState<boolean>(true);
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const cronJobs = [
    {
      id: 'nuki-precheck',
      label: 'Nuki – Precheck',
      endpoint: '/api/cron/nuki-precheck',
      description: 'Generate keys for arrivals within 3 days.'
    },
    {
      id: 'nuki-retry',
      label: 'Nuki – Retry Queue',
      endpoint: '/api/cron/nuki-retry',
      description: 'Process queued key generations immediately.'
    },
    {
      id: 'nuki-cleanup',
      label: 'Nuki – Cleanup',
      endpoint: '/api/cron/nuki-cleanup',
      description: 'Remove unused or stale Nuki authorisations.'
    },
    {
      id: 'nuki-expired-cleanup',
      label: 'Nuki – Expired Cleanup',
      endpoint: '/api/cron/nuki-expired-cleanup',
      description: 'Deactivate keys past their checkout window.'
    },
    {
      id: 'ensure-hostaway-links',
      label: 'HostAway – Ensure Links',
      endpoint: '/api/cron/ensure-hostaway-links',
      description: 'Backfill Nick & Jenny check-in links into HostAway.'
    },
    {
      id: 'hostaway-sync',
      label: 'HostAway – Full Sync',
      endpoint: '/api/cron/hostaway-sync',
      description: 'Trigger immediate HostAway → dashboard sync.'
    },
    {
      id: 'ubyport-exports',
      label: 'Ubyport Export',
      endpoint: '/api/cron/ubyport-exports',
      description: 'Re-send guest exports to the Czech police.'
    },
    {
      id: 'checkout-completion',
      label: 'Checkout Completion',
      endpoint: '/api/cron/checkout-completion',
      description: 'Finalize reservations that should be checked out.'
    },
  ] as const;

  type CronStatus = {
    status: 'idle' | 'running' | 'success' | 'error';
    message?: string;
  };

  const [cronStatuses, setCronStatuses] = useState<Record<string, CronStatus>>(() =>
    Object.fromEntries(cronJobs.map(job => [job.id, { status: 'idle' }]))
  );

  const applySearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const runCron = async (jobId: typeof cronJobs[number]['id']) => {
    const job = cronJobs.find(item => item.id === jobId);
    if (!job) {
      return;
    }

    setCronStatuses(prev => ({
      ...prev,
      [jobId]: { status: 'running' }
    }));

    const scheduleReset = () => {
      setTimeout(() => {
        setCronStatuses(prev => ({
          ...prev,
          [jobId]: prev[jobId]?.status === 'running' ? prev[jobId] : { status: 'idle' }
        }));
      }, 5000);
    };

    try {
      const response = await fetch(job.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ triggeredBy: 'admin-dashboard' }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = payload?.error || `Request failed with status ${response.status}`;
        setCronStatuses(prev => ({
          ...prev,
          [jobId]: { status: 'error', message }
        }));
        scheduleReset();
        return;
      }

      const payload = await response.json().catch(() => ({ success: true }));
      const message = typeof payload?.message === 'string'
        ? payload.message
        : 'Cron executed successfully';

      setCronStatuses(prev => ({
        ...prev,
        [jobId]: { status: 'success', message }
      }));
      scheduleReset();
    } catch (error) {
      setCronStatuses(prev => ({
        ...prev,
        [jobId]: {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unexpected error',
        }
      }));
      scheduleReset();
    }
  };

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
    }
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

  // Search function that checks multiple fields
  const searchBookings = (bookings: BookingData[], query: string): BookingData[] => {
    if (!query.trim()) return bookings;
    
    const lowerQuery = query.toLowerCase().trim();
    
    return bookings.filter(booking => {
      // Search in basic booking fields
      const searchFields = [
        booking.guestLeaderName,
        booking.guestLeaderEmail,
        booking.propertyName,
        booking.hostAwayId,
        booking.id,
        booking.status,
        booking.checkInToken,
        booking.universalKeypadCode || '',
        booking.roomNumber || ''
      ];
      
      // Check if any field contains the search query
      return searchFields.some(field => 
        field && field.toString().toLowerCase().includes(lowerQuery)
      );
    });
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

  // Apply search and filters
  const searchFilteredBookings = searchBookings(sortedBookings, searchQuery);
  
  const filteredBookings = searchFilteredBookings.filter(booking => {
    const checkInDate = new Date(booking.checkInDate);
    const checkOutDate = new Date(booking.checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Time filter (past/upcoming/upcoming30/inprogress). If searching, don't constrain by time.
    if (!searchQuery) {
      if (timeFilter === 'past' && checkInDate >= today) return false;
      if (timeFilter === 'upcoming' && checkInDate < today) return false;
      if (timeFilter === 'inprogress') {
        // In Progress: checked in AND checkout date hasn't passed yet
        if (booking.status !== 'CHECKED_IN' || checkOutDate < today) return false;
      }
    }
    if (!searchQuery && timeFilter === 'upcoming30') {
      // Show only bookings within next 30 days
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      thirtyDaysFromNow.setHours(23, 59, 59, 999); // End of 30th day
      if (checkInDate < today || checkInDate > thirtyDaysFromNow) return false;
    }
    
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

    if (hideCancelled) {
      const statusValue = booking.status?.toUpperCase?.() ?? '';
      if (statusValue === 'CANCELLED' || statusValue === 'CANCELED') {
        return false;
      }
    }
    return true;
  });

  useEffect(() => {
    fetchBookings();
  }, []);


  const totalBookings = filteredBookings.length;
  const pendingBookings = filteredBookings.filter(b => b.status === "PENDING").length;
  const checkedInBookings = filteredBookings.filter(b => b.status === "CHECKED_IN").length;
  const completedBookings = filteredBookings.filter(b => b.status === "COMPLETED").length;

  // Calculate In Progress: guests who have checked in but haven't checked out yet
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inProgressBookings = bookings.filter(b => {
    if (b.status !== "CHECKED_IN") return false;
    const checkOutDate = new Date(b.checkOutDate);
    return checkOutDate >= today; // Checkout date is today or in the future
  }).length;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <AdminNav />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl w-full mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 md:gap-6">
            <p className="text-muted-foreground">
              Manage all bookings and guest information
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" /> Manual Cron Triggers
              </CardTitle>
              <CardDescription>
                Trigger scheduled jobs on demand. These use POST requests, matching how Vercel crons invoke them.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {cronJobs.map((job) => {
                const state = cronStatuses[job.id] ?? { status: 'idle' };
                return (
                  <div key={job.id} className="border rounded-lg p-4 flex flex-col gap-2">
                    <div>
                      <p className="font-medium">{job.label}</p>
                      <p className="text-sm text-muted-foreground">{job.description}</p>
                    </div>
                    {state.message && (
                      <p className={`text-xs ${state.status === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                        {state.message}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => runCron(job.id)}
                        disabled={state.status === 'running'}
                      >
                        {state.status === 'running' ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Running…
                          </>
                        ) : (
                          'Run now'
                        )}
                      </Button>
                      {state.status === 'success' && (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                          Success
                        </Badge>
                      )}
                      {state.status === 'error' && (
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                          Failed
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">POST {job.endpoint}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 flex-wrap md:items-center mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground">Filter:</span>
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
                <Button
                  variant={timeFilter === 'upcoming30' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeFilter('upcoming30')}
                  className="h-8"
                >
                  30 Days
                </Button>
                <Button
                  variant={timeFilter === 'inprogress' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeFilter('inprogress')}
                  className="h-8"
                >
                  In Progress
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-xs text-muted-foreground">Check-in from</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-[160px]" />
                <Label className="text-xs text-muted-foreground">to</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-[160px]" />
                {(dateFrom || dateTo || timeFilter !== 'upcoming' || !hideCancelled) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                      setTimeFilter('upcoming');
                      setHideCancelled(true);
                    }}
                  >
                    Clear All
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="hide-cancelled"
                  type="checkbox"
                  checked={hideCancelled}
                  onChange={(event) => setHideCancelled(event.target.checked)}
                  className="h-4 w-4 border-muted"
                />
                <Label htmlFor="hide-cancelled" className="text-sm text-muted-foreground">
                  Hide cancelled reservations
                </Label>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className={`grid grid-cols-1 gap-3 mb-6 ${
            timeFilter === 'upcoming' || timeFilter === 'upcoming30' || timeFilter === 'inprogress'
              ? 'md:grid-cols-4'
              : 'md:grid-cols-5'
          }`}>
            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {timeFilter === 'all' ? 'Total Bookings' :
                     timeFilter === 'past' ? 'Past Bookings' :
                     timeFilter === 'upcoming' ? 'Upcoming Bookings' :
                     timeFilter === 'upcoming30' ? 'Next 30 Days' :
                     timeFilter === 'inprogress' ? 'In Progress' :
                     'Filtered Bookings'}
                  </p>
                  <p className="text-xl font-bold">{totalBookings}</p>
                </div>
                <Home className="h-4 w-4 text-muted-foreground" />
              </div>
            </Card>

            {/* Hide Completed card for future-focused and in-progress filters */}
            {timeFilter !== 'upcoming' && timeFilter !== 'upcoming30' && timeFilter !== 'inprogress' && (
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Completed</p>
                    <p className="text-xl font-bold text-blue-600">{completedBookings}</p>
                  </div>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              </Card>
            )}

            {/* Hide Pending card for in-progress filter (they've already checked in) */}
            {timeFilter !== 'inprogress' && (
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Pending</p>
                    <p className="text-xl font-bold text-yellow-600">{pendingBookings}</p>
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </Card>
            )}

            {/* Show In Progress card for all filters except when it's the main filter */}
            {timeFilter !== 'inprogress' && (
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">In Progress</p>
                    <p className="text-xl font-bold text-green-600">{inProgressBookings}</p>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              </Card>
            )}

            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Checked In</p>
                  <p className="text-xl font-bold text-orange-600">{checkedInBookings}</p>
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </Card>

            {/* Show additional relevant cards for In Progress filter */}
            {timeFilter === 'inprogress' && (
              <>
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Total Guests</p>
                      <p className="text-xl font-bold text-purple-600">
                        {filteredBookings.reduce((total, booking) => total + booking.numberOfGuests, 0)}
                      </p>
                    </div>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Check-outs Today</p>
                      <p className="text-xl font-bold text-orange-600">
                        {filteredBookings.filter(booking => {
                          const checkOut = new Date(booking.checkOutDate);
                          const today = new Date();
                          checkOut.setHours(0, 0, 0, 0);
                          today.setHours(0, 0, 0, 0);
                          return checkOut.getTime() === today.getTime();
                        }).length}
                      </p>
                    </div>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* Bookings Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reservations</CardTitle>
              <CardDescription>
                Synced with HostAway
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                {/* Search Bar */}
                <div className="flex items-center gap-2 mb-4">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search reservations (name, email, property, booking ID...)"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        applySearch();
                      }
                    }}
                    className="max-w-md"
                  />
                  <Button
                    size="sm"
                    onClick={applySearch}
                    className="h-8"
                  >
                    Search
                  </Button>
                  {(searchInput || searchQuery) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSearch}
                      className="h-8 px-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
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
                          className="cursor-pointer hover:bg-muted/50 select-none w-[10%] sm:w-[11%]"
                          onClick={() => handleSort('checkInDate')}
                        >
                          <div className="flex items-center gap-1 text-xs">
                            Check-in
                            {React.createElement(getSortIcon('checkInDate'), { className: "h-3 w-3" })}
                          </div>
                        </TableHead>
                        <TableHead className="w-[10%] sm:w-[11%] text-xs hidden sm:table-cell">Check-out</TableHead>
                        <TableHead className="w-[7%] text-xs hidden md:table-cell">Guests</TableHead>
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
                            <TableCell className="text-sm whitespace-nowrap hidden sm:table-cell">
                              {formatDate(booking.checkOutDate)}
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
