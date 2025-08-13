"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function AdminSettingsPage() {
  const [email, setEmail] = useState("nick@investmentsolutions.cz");
  const [password, setPassword] = useState("123456");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Webhook management state
  const [webhooks, setWebhooks] = useState<Array<{id: number; url: string; isEnabled: boolean}>>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

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

  useEffect(() => {
    loadWebhooks();
    // Set default webhook URL to current domain
    setWebhookUrl(`${window.location.origin}/api/webhooks/hostaway`);
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
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

      </div>
    </div>
  );
} 