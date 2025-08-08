"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function AdminSettingsPage() {
  const [email, setEmail] = useState("nick@investmentsolutions.cz");
  const [password, setPassword] = useState("123456");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Settings</CardTitle>
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
            {status && <p className="text-sm">{status}</p>}
            <Button onClick={save} disabled={loading} className="w-full">{loading ? 'Saving...' : 'Save'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 