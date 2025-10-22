"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

import { AdminNav } from "@/components/admin/AdminNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";

type ReportEntry = {
  bookingId: string;
  hostAwayId: string;
  apartment: string;
  leadGuest: string;
  numberOfGuests: number;
  checkInDate: string;
  checkOutDate: string;
  totalPaid: number;
  currency: string;
  cityTaxPaid: boolean;
};

type ReportSummary = {
  totalBookings: number;
  paidCount: number;
  unpaidCount: number;
};

function toDateInputValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().split("T")[0] ?? "";
}

function formatDisplayDate(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: currency || "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildCsv(data: ReportEntry[]): string {
  const headers = [
    "Apartment",
    "Lead guest",
    "HostAway ID",
    "Check-in",
    "Check-out",
    "Guests",
    "Total paid",
    "Currency",
    "City tax paid",
  ];

  const escape = (value: string | number | boolean) => {
    const stringValue = String(value ?? "");
    if (stringValue.includes('"') || stringValue.includes(",") || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const rows = data.map((item) => [
    escape(item.apartment),
    escape(item.leadGuest),
    escape(item.hostAwayId),
    escape(formatDisplayDate(item.checkInDate)),
    escape(formatDisplayDate(item.checkOutDate)),
    escape(item.numberOfGuests),
    escape(item.totalPaid),
    escape(item.currency),
    escape(item.cityTaxPaid ? "Paid" : "Unpaid"),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export default function CityTaxReportsPage() {
  useAuth();

  const now = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return toDateInputValue(firstDayCurrentMonth);
  }, [now]);

  const defaultTo = useMemo(() => toDateInputValue(now), [now]);

  const [dateFrom, setDateFrom] = useState<string>(defaultFrom);
  const [dateTo, setDateTo] = useState<string>(defaultTo);
  const [reportData, setReportData] = useState<ReportEntry[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const totalCollected = useMemo(
    () => reportData.reduce((sum, item) => sum + item.totalPaid, 0),
    [reportData],
  );

  const fetchReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const response = await fetch(`/api/reports/city-tax?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.error ?? "Unknown error");
      }

      setReportData(payload.data ?? []);
      setSummary(payload.summary ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch report");
      setReportData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    if (reportData.length === 0) return;
    const csvContent = buildCsv(reportData);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const filename = `city-tax-report-${dateFrom || "all"}-${dateTo || "all"}.csv`;

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">City Tax Report</h1>
                <p className="text-sm text-muted-foreground">
                  Review who has settled their city tax and export the results for compliance.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="default" disabled={loading || reportData.length === 0} onClick={handleDownloadCsv}>
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
                <Button variant="outline" disabled={loading} onClick={fetchReport}>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" style={{ animationPlayState: loading ? "running" : "paused" }} />
                  {loading ? "Refreshing…" : "Run Report"}
                </Button>
              </div>
            </div>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>Date range</CardTitle>
              <CardDescription>Select the check-in window you would like to review.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 md:items-end">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="date-from">From</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="w-full md:w-[220px]"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="date-to">To</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="w-full md:w-[220px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => {
                    setDateFrom(defaultFrom);
                    setDateTo(defaultTo);
                  }}>
                    Reset to current month
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}>
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="py-6 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Unable to load report</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total bookings</CardDescription>
                <CardTitle className="text-2xl">{summary?.totalBookings ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>City tax paid</CardDescription>
                <CardTitle className="text-2xl text-green-600">{summary?.paidCount ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>City tax outstanding</CardDescription>
                <CardTitle className="text-2xl text-yellow-600">{summary?.unpaidCount ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total collected</CardDescription>
                <CardTitle className="text-2xl">
                  {reportData.length > 0 ? formatCurrency(totalCollected, reportData[0]?.currency ?? "CZK") : "CZK 0"}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
              <CardDescription>
                {loading
                  ? "Loading booking data…"
                  : reportData.length === 0
                    ? "No bookings found for the selected period."
                    : `Showing ${reportData.length} bookings.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[24%]">Apartment</TableHead>
                      <TableHead className="w-[20%]">Lead guest</TableHead>
                      <TableHead className="hidden md:table-cell w-[14%]">HostAway ID</TableHead>
                      <TableHead className="w-[12%]">Check-in</TableHead>
                      <TableHead className="hidden sm:table-cell w-[12%]">Check-out</TableHead>
                      <TableHead className="hidden md:table-cell text-center w-[8%]">Guests</TableHead>
                      <TableHead className="text-right w-[12%]">Total paid</TableHead>
                      <TableHead className="text-center w-[12%]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">
                          Loading…
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading && reportData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No bookings found.
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading &&
                      reportData.map((booking) => (
                        <TableRow key={booking.bookingId}>
                          <TableCell className="max-w-[260px] truncate w-[24%]" title={booking.apartment}>
                            {booking.apartment}
                          </TableCell>
                          <TableCell className="w-[20%]">{booking.leadGuest || "—"}</TableCell>
                          <TableCell className="hidden md:table-cell w-[14%]">{booking.hostAwayId}</TableCell>
                          <TableCell className="w-[12%]">{formatDisplayDate(booking.checkInDate)}</TableCell>
                          <TableCell className="hidden sm:table-cell w-[12%]">{formatDisplayDate(booking.checkOutDate)}</TableCell>
                          <TableCell className="hidden md:table-cell text-center w-[8%]">{booking.numberOfGuests}</TableCell>
                          <TableCell className="text-right w-[12%]">
                            {formatCurrency(booking.totalPaid, booking.currency)}
                          </TableCell>
                          <TableCell className="text-center w-[12%]">
                            {booking.cityTaxPaid ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Paid
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-3 py-1">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
