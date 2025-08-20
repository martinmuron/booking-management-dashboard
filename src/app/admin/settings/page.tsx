"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function AdminSettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("nick@investmentsolutions.cz");
  const [password, setPassword] = useState("123456");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Webhook management state
  const [webhooks, setWebhooks] = useState<Array<{id: number; url: string; isEnabled: boolean}>>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);
  
  // Webhook logs state
  const [webhookLogs, setWebhookLogs] = useState<Array<{
    id: string;
    timestamp: string;
    eventType: string;
    status: 'success' | 'error';
    message: string;
    reservationId?: string;
    error?: string;
  }>>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  
  // Bulk update state
  const [bulkUpdateCount, setBulkUpdateCount] = useState<number | null>(null);
  const [bulkUpdateLoading, setBulkUpdateLoading] = useState(false);
  const [bulkUpdateStatus, setBulkUpdateStatus] = useState<string | null>(null);
  const [bulkUpdateResult, setBulkUpdateResult] = useState<{
    updated: number;
    failed: number;
    total: number;
    failures?: Array<{bookingId: string; error: string}>;
  } | null>(null);
  
  // Chunked update state
  const [chunkUpdateProgress, setChunkUpdateProgress] = useState<{
    current: number;
    total: number;
    successful: number;
    failed: number;
    isRunning: boolean;
  }>({
    current: 0,
    total: 0,
    successful: 0,
    failed: 0,
    isRunning: false
  });

  const save = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/settings/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatus(data.error || 'Failed to save');
        return;
      }
      setStatus('Saved');
    } catch {
      setStatus('Failed to save');
    } finally {
      setLoading(false);
    }
  };

  // Load existing webhooks
  const loadWebhooks = async () => {
    try {
      const res = await fetch('/api/webhooks/manage');
      const data = await res.json();
      if (data.success) {
        setWebhooks(data.webhooks || []);
      }
    } catch (error) {
      console.error('Failed to load webhooks:', error);
    }
  };

  // Create webhook
  const createWebhook = async () => {
    if (!webhookUrl) return;
    
    setWebhookLoading(true);
    setWebhookStatus(null);
    
    try {
      const res = await fetch('/api/webhooks/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          alertEmail: email
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setWebhookStatus('Webhook created successfully!');
        setWebhookUrl('');
        loadWebhooks();
      } else {
        setWebhookStatus(data.error || 'Failed to create webhook');
      }
    } catch {
      setWebhookStatus('Failed to create webhook');
    } finally {
      setWebhookLoading(false);
    }
  };

  // Toggle webhook
  const toggleWebhook = async (webhookId: number, currentEnabled: boolean) => {
    try {
      const res = await fetch('/api/webhooks/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookId,
          isEnabled: !currentEnabled
        })
      });
      
      if (res.ok) {
        loadWebhooks();
      }
    } catch (error) {
      console.error('Failed to toggle webhook:', error);
    }
  };

  // Delete webhook
  const deleteWebhook = async (webhookId: number) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    
    try {
      const res = await fetch(`/api/webhooks/manage?id=${webhookId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        loadWebhooks();
      }
    } catch (error) {
      console.error('Failed to delete webhook:', error);
    }
  };

  // Load webhook logs
  const loadWebhookLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/webhooks/logs');
      const data = await res.json();
      if (data.success) {
        setWebhookLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to load webhook logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  // Clear webhook logs
  const clearWebhookLogs = async () => {
    if (!confirm('Are you sure you want to clear all webhook logs?')) return;
    
    try {
      const res = await fetch('/api/webhooks/logs', {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setWebhookLogs([]);
      }
    } catch (error) {
      console.error('Failed to clear webhook logs:', error);
    }
  };

  // Bulk update functions
  const checkBulkUpdateCount = async () => {
    setBulkUpdateLoading(true);
    setBulkUpdateStatus(null);
    try {
      const response = await fetch('/api/bookings/bulk-update-links');
      const data = await response.json();
      
      if (data.success) {
        setBulkUpdateCount(data.count);
        setBulkUpdateStatus(`Found ${data.count} existing bookings that can be updated with HostAway check-in links`);
      } else {
        setBulkUpdateStatus(`Error: ${data.error}`);
      }
    } catch {
      setBulkUpdateStatus('Failed to check booking count');
    } finally {
      setBulkUpdateLoading(false);
    }
  };

  const runBulkUpdate = async () => {
    if (!confirm(`This will update ${bulkUpdateCount || 'all existing'} reservations in HostAway with check-in links. This action may take several minutes. Continue?`)) {
      return;
    }
    
    setBulkUpdateLoading(true);
    setBulkUpdateStatus('Starting bulk update... This may take a few minutes.');
    setBulkUpdateResult(null);
    
    try {
      const response = await fetch('/api/bookings/bulk-update-links', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setBulkUpdateResult(data);
        setBulkUpdateStatus(`✅ Bulk update completed! Updated ${data.updated} bookings successfully, ${data.failed} failed.`);
      } else {
        setBulkUpdateStatus(`❌ Bulk update failed: ${data.error}`);
      }
    } catch {
      setBulkUpdateStatus('❌ Failed to run bulk update');
    } finally {
      setBulkUpdateLoading(false);
    }
  };

  // Recent 1000 bookings update function
  const runRecentUpdate = async () => {
    if (!confirm('This will update only the most recent 1000 bookings in HostAway with check-in links. This is faster than updating all bookings. Continue?')) {
      return;
    }
    
    setBulkUpdateLoading(true);
    setBulkUpdateStatus('Starting recent 1000 bookings update...');
    setBulkUpdateResult(null);
    setChunkUpdateProgress({
      current: 0,
      total: Math.min(1000, bulkUpdateCount || 1000),
      successful: 0,
      failed: 0,
      isRunning: true
    });
    
    let offset = 0;
    const limit = 50;
    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let hasMore = true;
    
    try {
      while (hasMore) {
        const response = await fetch('/api/bookings/bulk-update-links-recent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ offset, limit })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Chunk update failed');
        }
        
        totalProcessed += data.processed;
        totalSuccessful += data.successful;
        totalFailed += data.failed;
        hasMore = data.hasMore;
        
        setChunkUpdateProgress({
          current: totalProcessed,
          total: data.totalCount,
          successful: totalSuccessful,
          failed: totalFailed,
          isRunning: hasMore
        });
        
        setBulkUpdateStatus(`Processing recent bookings: ${totalProcessed}/${data.totalCount} (${data.progress}%)`);
        
        if (hasMore) {
          offset = data.nextOffset;
          // Small delay between chunks to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      setBulkUpdateResult({
        updated: totalSuccessful,
        failed: totalFailed,
        total: totalProcessed
      });
      setBulkUpdateStatus(`✅ Recent 1000 bookings update completed! Updated ${totalSuccessful} bookings successfully, ${totalFailed} failed.`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setBulkUpdateStatus(`❌ Recent update failed: ${errorMessage}`);
      setChunkUpdateProgress({
        current: totalProcessed,
        total: Math.min(1000, bulkUpdateCount || 1000),
        successful: totalSuccessful,
        failed: totalFailed,
        isRunning: false
      });
    } finally {
      setBulkUpdateLoading(false);
    }
  };

  // Smart chunked update function (recommended for large datasets)
  const runChunkedUpdate = async () => {
    if (!confirm(`This will update ${bulkUpdateCount || 'all existing'} reservations in HostAway with check-in links. The process will run in small chunks to avoid timeouts. This is the recommended approach for large numbers of bookings. Continue?`)) {
      return;
    }

    setChunkUpdateProgress({
      current: 0,
      total: bulkUpdateCount || 0,
      successful: 0,
      failed: 0,
      isRunning: true
    });

    setBulkUpdateLoading(true);
    setBulkUpdateResult(null);

    let offset = 0;
    const chunkSize = 50;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        setBulkUpdateStatus(`Processing bookings ${offset + 1} to ${offset + chunkSize}...`);
        
        const response = await fetch('/api/bookings/bulk-update-links-chunked', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offset, limit: chunkSize })
        });
        
        const data = await response.json();
        
        if (data.success) {
          totalSuccessful += data.successful;
          totalFailed += data.failed;
          
          setChunkUpdateProgress({
            current: offset + data.processed,
            total: data.totalCount,
            successful: totalSuccessful,
            failed: totalFailed,
            isRunning: true
          });
          
          hasMore = data.hasMore;
          offset = data.nextOffset;
          
          setBulkUpdateStatus(`Processed ${offset} / ${data.totalCount} bookings (${data.progress}% complete)`);
          
          // Small delay between chunks
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw new Error(data.error || 'Chunk processing failed');
        }
      } catch (error) {
        setBulkUpdateStatus(`❌ Error during chunked update: ${error instanceof Error ? error.message : 'Unknown error'}`);
        hasMore = false;
      }
    }

    setChunkUpdateProgress(prev => ({ ...prev, isRunning: false }));
    setBulkUpdateLoading(false);
    setBulkUpdateResult({
      updated: totalSuccessful,
      failed: totalFailed,
      total: totalSuccessful + totalFailed
    });
    setBulkUpdateStatus(`✅ Chunked update completed! Updated ${totalSuccessful} bookings successfully, ${totalFailed} failed out of ${totalSuccessful + totalFailed} processed.`);
  };

  useEffect(() => {
    loadWebhooks();
    loadWebhookLogs();
    // Set default webhook URL to current domain
    setWebhookUrl(`${window.location.origin}/api/webhooks/hostaway`);
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Admin Settings</h1>
              <p className="text-muted-foreground text-sm">Configure credentials and webhooks</p>
            </div>
          </div>
        </div>
        
        {/* Admin Credentials */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Credentials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Admin Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">Admin Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {status && <p className="text-sm text-green-600">{status}</p>}
              <Button onClick={save} disabled={loading} className="w-full">
                {loading ? 'Saving...' : 'Save Credentials'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Management */}
        <Card>
          <CardHeader>
            <CardTitle>Real-time Webhooks</CardTitle>
            <p className="text-sm text-muted-foreground">
              Set up HostAway webhooks to receive instant notifications for new bookings and updates.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              
              {/* Create Webhook */}
              <div>
                <Label className="text-sm">Webhook URL</Label>
                <div className="flex gap-2">
                  <Input 
                    value={webhookUrl} 
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://yourdomain.com/api/webhooks/hostaway"
                    className="flex-1"
                  />
                  <Button 
                    onClick={createWebhook} 
                    disabled={webhookLoading || !webhookUrl}
                  >
                    {webhookLoading ? 'Creating...' : 'Create'}
                  </Button>
                </div>
                {webhookStatus && (
                  <p className={`text-sm mt-2 ${webhookStatus.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                    {webhookStatus}
                  </p>
                )}
              </div>

              {/* Existing Webhooks */}
              {webhooks.length > 0 && (
                <div>
                  <Label className="text-sm">Existing Webhooks</Label>
                  <div className="space-y-2 mt-2">
                    {webhooks.map((webhook) => (
                      <div key={webhook.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{webhook.url}</p>
                          <p className="text-xs text-muted-foreground">
                            Status: {webhook.isEnabled ? '🟢 Enabled' : '🔴 Disabled'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleWebhook(webhook.id, webhook.isEnabled)}
                          >
                            {webhook.isEnabled ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteWebhook(webhook.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">How it works:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• HostAway sends instant notifications when bookings are created or updated</li>
                  <li>• New bookings appear in your dashboard immediately</li>
                  <li>• No more waiting for manual syncs or polling</li>
                  <li>• Webhook URL should be your deployed domain + /api/webhooks/hostaway</li>
                </ul>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Webhook Activity Logs */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Webhook Activity Logs</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Monitor webhook events and troubleshoot issues
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadWebhookLogs}
                  disabled={logsLoading}
                >
                  {logsLoading ? 'Loading...' : 'Refresh'}
                </Button>
                {webhookLogs.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={clearWebhookLogs}
                  >
                    Clear Logs
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="text-center py-4">Loading webhook logs...</div>
            ) : webhookLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No webhook activity yet</p>
                <p className="text-xs mt-1">Logs will appear here when HostAway sends webhook notifications</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {webhookLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded border-l-4 ${
                      log.status === 'success' 
                        ? 'border-l-green-500 bg-green-50' 
                        : 'border-l-red-500 bg-red-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          log.status === 'success' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status === 'success' ? '✅' : '❌'} {log.eventType}
                        </span>
                        {log.reservationId && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            ID: {log.reservationId}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm">{log.message}</p>
                    {log.error && (
                      <p className="text-xs text-red-600 mt-1 font-mono bg-red-100 p-2 rounded">
                        {log.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Update HostAway Check-in Links */}
        <Card>
          <CardHeader>
            <CardTitle>Bulk Update Check-in Links</CardTitle>
            <p className="text-sm text-muted-foreground">
              Update all existing reservations in HostAway with personalized check-in links.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              
              {/* Check Count */}
              <div>
                <Button 
                  onClick={checkBulkUpdateCount} 
                  disabled={bulkUpdateLoading}
                  variant="outline"
                >
                  {bulkUpdateLoading ? 'Checking...' : 'Check How Many Bookings Can Be Updated'}
                </Button>
              </div>

              {/* Status */}
              {bulkUpdateStatus && (
                <div className={`p-3 rounded border-l-4 ${
                  bulkUpdateStatus.includes('✅') 
                    ? 'border-l-green-500 bg-green-50' 
                    : bulkUpdateStatus.includes('❌')
                    ? 'border-l-red-500 bg-red-50'
                    : 'border-l-blue-500 bg-blue-50'
                }`}>
                  <p className="text-sm">{bulkUpdateStatus}</p>
                </div>
              )}

              {/* Progress Bar for Chunked Updates */}
              {chunkUpdateProgress.isRunning && chunkUpdateProgress.total > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress: {chunkUpdateProgress.current} / {chunkUpdateProgress.total}</span>
                    <span>{Math.round((chunkUpdateProgress.current / chunkUpdateProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(chunkUpdateProgress.current / chunkUpdateProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>✅ Successful: {chunkUpdateProgress.successful}</span>
                    <span>❌ Failed: {chunkUpdateProgress.failed}</span>
                  </div>
                </div>
              )}

              {/* Run Update Button */}
              {bulkUpdateCount !== null && bulkUpdateCount > 0 && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">⚠️ Important:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1 mb-3">
                    <li>• This will update {bulkUpdateCount} existing reservations in HostAway</li>
                    <li>• The process may take several minutes to complete</li>
                    <li>• Updates are done in batches to respect API rate limits</li>
                    <li>• Your booking system will continue working during the update</li>
                    <li>• Failed updates are logged but won&apos;t break the process</li>
                  </ul>
                  <div className="space-y-2">
                    <Button 
                      onClick={runChunkedUpdate} 
                      disabled={bulkUpdateLoading}
                      className="w-full"
                    >
                      {bulkUpdateLoading ? 'Updating... Please wait' : `Smart Update ${bulkUpdateCount} Reservations (Recommended)`}
                    </Button>
                    <Button 
                      onClick={runRecentUpdate} 
                      disabled={bulkUpdateLoading}
                      variant="secondary"
                      className="w-full"
                    >
                      {bulkUpdateLoading ? 'Updating... Please wait' : 'Quick Update - Recent 1000 Only'}
                    </Button>
                    <Button 
                      onClick={runBulkUpdate} 
                      disabled={bulkUpdateLoading}
                      variant="outline"
                      className="w-full"
                    >
                      {bulkUpdateLoading ? 'Updating... Please wait' : `Legacy Update ${bulkUpdateCount} Reservations (May Timeout)`}
                    </Button>
                  </div>
                </div>
              )}

              {/* Results */}
              {bulkUpdateResult && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Update Results:</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-green-50 rounded">
                      <div className="text-lg font-bold text-green-600">{bulkUpdateResult.updated}</div>
                      <div className="text-xs text-green-600">Updated</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded">
                      <div className="text-lg font-bold text-red-600">{bulkUpdateResult.failed}</div>
                      <div className="text-xs text-red-600">Failed</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded">
                      <div className="text-lg font-bold text-blue-600">{bulkUpdateResult.total}</div>
                      <div className="text-xs text-blue-600">Total</div>
                    </div>
                  </div>
                  
                  {bulkUpdateResult.failures && bulkUpdateResult.failures.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-red-600">First Few Failures:</h5>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {bulkUpdateResult.failures.slice(0, 5).map((failure, index) => (
                          <div key={index} className="text-xs bg-red-100 p-2 rounded">
                            <span className="font-medium">{failure.bookingId}:</span> {failure.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">How it works:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Finds all existing bookings with check-in tokens and HostAway IDs</li>
                  <li>• Updates each reservation&apos;s custom field in HostAway with the check-in link</li>
                  <li>• HostAway email templates can then use {`{{reservation_check_in_link_nick_jenny}}`}</li>
                  <li>• Failed updates are logged but don&apos;t stop the process</li>
                  <li>• Only run this once after setting up the integration</li>
                </ul>
              </div>

            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
} 