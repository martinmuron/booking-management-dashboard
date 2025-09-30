"use client";

import { useState } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";

const cronJobs = [
  {
    id: "nuki-precheck",
    label: "Nuki – Precheck",
    endpoint: "/api/cron/nuki-precheck",
    description: "Generate keys for arrivals within 3 days.",
  },
  {
    id: "nuki-retry",
    label: "Nuki – Retry Queue",
    endpoint: "/api/cron/nuki-retry",
    description: "Process queued key generations immediately.",
  },
  {
    id: "nuki-cleanup",
    label: "Nuki – Cleanup",
    endpoint: "/api/cron/nuki-cleanup",
    description: "Remove unused or stale Nuki authorisations.",
  },
  {
    id: "nuki-expired-cleanup",
    label: "Nuki – Expired Cleanup",
    endpoint: "/api/cron/nuki-expired-cleanup",
    description: "Deactivate keys past their checkout window.",
  },
  {
    id: "ensure-hostaway-links",
    label: "HostAway – Ensure Links",
    endpoint: "/api/cron/ensure-hostaway-links",
    description: "Backfill Nick & Jenny check-in links into HostAway.",
  },
  {
    id: "hostaway-sync",
    label: "HostAway – Full Sync",
    endpoint: "/api/cron/hostaway-sync",
    description: "Trigger immediate HostAway → dashboard sync.",
  },
  {
    id: "ubyport-exports",
    label: "Ubyport Export",
    endpoint: "/api/cron/ubyport-exports",
    description: "Re-send guest exports to the Czech police.",
  },
  {
    id: "checkout-completion",
    label: "Checkout Completion",
    endpoint: "/api/cron/checkout-completion",
    description: "Finalize reservations that should be checked out.",
  },
] as const;

type CronStatus = {
  status: "idle" | "running" | "success" | "error";
  message?: string;
};

export default function ManualSyncPage() {
  const [cronStatuses, setCronStatuses] = useState<Record<string, CronStatus>>(() =>
    Object.fromEntries(cronJobs.map((job) => [job.id, { status: "idle" }]))
  );

  const runCron = async (jobId: typeof cronJobs[number]["id"]) => {
    const job = cronJobs.find((item) => item.id === jobId);
    if (!job) {
      return;
    }

    setCronStatuses((prev) => ({
      ...prev,
      [jobId]: { status: "running" },
    }));

    const scheduleReset = () => {
      setTimeout(() => {
        setCronStatuses((prev) => ({
          ...prev,
          [jobId]: prev[jobId]?.status === "running" ? prev[jobId] : { status: "idle" },
        }));
      }, 5000);
    };

    try {
      const response = await fetch(job.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ triggeredBy: "manual-sync" }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = payload?.error || `Request failed with status ${response.status}`;
        setCronStatuses((prev) => ({
          ...prev,
          [jobId]: { status: "error", message },
        }));
        scheduleReset();
        return;
      }

      const payload = await response.json().catch(() => ({ success: true }));
      const message = typeof payload?.message === "string" ? payload.message : "Cron executed successfully";

      setCronStatuses((prev) => ({
        ...prev,
        [jobId]: { status: "success", message },
      }));
      scheduleReset();
    } catch (error) {
      setCronStatuses((prev) => ({
        ...prev,
        [jobId]: {
          status: "error",
          message: error instanceof Error ? error.message : "Unexpected error",
        },
      }));
      scheduleReset();
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <AdminNav />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
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
                const state = cronStatuses[job.id] ?? { status: "idle" };
                return (
                  <div key={job.id} className="border rounded-lg p-4 flex flex-col gap-2">
                    <div>
                      <p className="font-medium">{job.label}</p>
                      <p className="text-sm text-muted-foreground">{job.description}</p>
                    </div>
                    {state.message && (
                      <p className={`text-xs ${state.status === "error" ? "text-red-600" : "text-emerald-600"}`}>
                        {state.message}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => runCron(job.id)}
                        disabled={state.status === "running"}
                      >
                        {state.status === "running" ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Running…
                          </>
                        ) : (
                          "Run now"
                        )}
                      </Button>
                      {state.status === "success" && (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                          Success
                        </Badge>
                      )}
                      {state.status === "error" && (
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
        </div>
      </div>
    </div>
  );
}
