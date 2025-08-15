'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Lock, 
  Unlock, 
  Wifi, 
  WifiOff, 
  Battery, 
  BatteryLow, 
  Shield, 
  Activity, 
  Users, 
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Key,
  Smartphone,
  DoorOpen,
  RefreshCw
} from 'lucide-react';

interface NukiDevice {
  smartlockId: number;
  name: string;
  type: number;
  deviceTypeName: string;
  state: number;
  stateName: string;
  serverState: number;
  serverStateName: string;
  batteryCritical: boolean;
  batteryCharging: boolean;
  batteryChargeState: number;
  keypadBatteryCritical: boolean;
  doorsensorState: number;
  doorsensorStateName: string;
  dateCreated: string;
  dateUpdated: string;
  virtualDevice: boolean;
  recentLogs?: Array<{
    date: string;
    data: {
      actionName?: string;
      triggerName?: string;
      stateName?: string;
    };
    name: string;
  }>;
  authorizations?: Array<{
    id: number;
    name: string;
    enabled: boolean;
  }>;
  authCount?: number;
  activeAuthCount?: number;
}

interface NukiAuth {
  id: number;
  name: string;
  enabled: boolean;
  type: number;
  typeName: string;
  smartlockIds: number[];
  lastActiveDate: string;
  creationDate: string;
  allowedFromDate?: string;
  allowedUntilDate?: string;
  isExpired?: boolean;
  isActive?: boolean;
  hasTimeRestriction?: boolean;
  devices?: Array<{
    id: number;
    name: string;
    type: string;
    state: string;
  }>;
}

interface NukiStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  lockedDevices: number;
  unlockedDevices: number;
  totalAuthorizations: number;
  activeAuthorizations: number;
  criticalBatteries: number;
}

export default function NukiManagementPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<NukiStats | null>(null);
  const [devices, setDevices] = useState<NukiDevice[]>([]);
  const [authorizations, setAuthorizations] = useState<NukiAuth[]>([]);
  const [recentActivity, setRecentActivity] = useState<Array<{
    date: string;
    data?: {
      actionName?: string;
      triggerName?: string;
      stateName?: string;
    };
    name: string;
    deviceName?: string;
    deviceId?: number;
  }>>([]);

  const fetchOverviewData = async () => {
    try {
      setError(null);
      const response = await fetch('/api/nuki/overview');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch Nuki data');
      }

      const { stats: overviewStats, devices: overviewDevices, recentActivity: activity, authorizations: auths } = result.data || {};
      
      setStats(overviewStats || null);
      setDevices(overviewDevices || []);
      setRecentActivity(activity || []);
      setAuthorizations(auths || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      // Set empty defaults on error
      setStats(null);
      setDevices([]);
      setRecentActivity([]);
      setAuthorizations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAllDevices = async () => {
    try {
      const response = await fetch('/api/nuki/devices');
      const result = await response.json();

      if (result.success) {
        setDevices(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching all devices:', err);
      setDevices([]);
    }
  };

  const fetchAllAuthorizations = async () => {
    try {
      const response = await fetch('/api/nuki/authorizations');
      const result = await response.json();

      if (result.success) {
        setAuthorizations(result.data?.authorizations || []);
      }
    } catch (err) {
      console.error('Error fetching all authorizations:', err);
      setAuthorizations([]);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOverviewData();
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const getDeviceIcon = (device: NukiDevice) => {
    if (device.serverState !== 0) return <WifiOff className="h-4 w-4 text-red-500" />;
    
    switch (device.state) {
      case 1: return <Lock className="h-4 w-4 text-green-500" />;
      case 3: return <Unlock className="h-4 w-4 text-yellow-500" />;
      case 5: return <DoorOpen className="h-4 w-4 text-blue-500" />;
      default: return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (state: number, serverState: number) => {
    if (serverState !== 0) return 'destructive';
    
    switch (state) {
      case 1: return 'default'; // Locked
      case 3: return 'secondary'; // Unlocked
      case 5: return 'outline'; // Unlatched
      default: return 'secondary';
    }
  };

  const getBatteryIcon = (device: NukiDevice) => {
    const isCritical = device.batteryCritical || device.keypadBatteryCritical;
    const isCharging = device.batteryCharging;
    
    if (isCritical) {
      return <BatteryLow className="h-4 w-4 text-red-500" />;
    }
    
    return <Battery className={`h-4 w-4 ${isCharging ? 'text-green-500' : 'text-gray-500'}`} />;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const asNum = Number(dateString);
    const d = isNaN(asNum) ? new Date(dateString) : new Date(asNum);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString();
  };

  const getAuthIcon = (auth: NukiAuth) => {
    switch (auth.type) {
      case 0: return <Smartphone className="h-4 w-4" />;
      case 3:
      case 13: return <Key className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Error loading Nuki data: {error}</span>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nuki Management</h1>
          <p className="text-gray-600">Manage your Nuki smart locks and access control</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDevices}</div>
              <p className="text-xs text-muted-foreground">
                {stats.onlineDevices} online, {stats.offlineDevices} offline
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Device Status</CardTitle>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lockedDevices}</div>
              <p className="text-xs text-muted-foreground">
                {stats.lockedDevices} locked, {stats.unlockedDevices} unlocked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Authorizations</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAuthorizations}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeAuthorizations} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Battery Status</CardTitle>
              <Battery className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.criticalBatteries}</div>
              <p className="text-xs text-muted-foreground">
                Critical batteries
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="authorizations">Authorizations</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Smart Lock Devices</h2>
            <Button onClick={fetchAllDevices} variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Load All Devices
            </Button>
          </div>

          <div className="grid gap-6">
            {devices && devices.length > 0 ? devices.map((device) => (
              <Card key={device.smartlockId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getDeviceIcon(device)}
                      <div>
                        <CardTitle className="text-lg">{device.name}</CardTitle>
                        <CardDescription>{device.deviceTypeName}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getBatteryIcon(device)}
                      <Badge variant={getStatusColor(device.state, device.serverState)}>
                        {device.stateName}
                      </Badge>
                      {device.serverState === 0 ? (
                        <Badge variant="outline" className="text-green-600">
                          <Wifi className="h-3 w-3 mr-1" />
                          Online
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <WifiOff className="h-3 w-3 mr-1" />
                          Offline
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Device ID</p>
                      <p className="font-medium">{device.smartlockId}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Battery</p>
                      <p className="font-medium">
                        {typeof device.batteryChargeState === 'number' && device.batteryChargeState > 0
                          ? `${device.batteryChargeState}%`
                          : device.batteryCritical
                            ? 'Critical'
                            : '-'}
                        {device.batteryCharging && ' (Charging)'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Door Sensor</p>
                      <p className="font-medium">{device.doorsensorStateName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Updated</p>
                      <p className="font-medium">{formatDate(device.dateUpdated)}</p>
                    </div>
                  </div>

                  {/* Keys (Authorizations) for this device */}
                  <div className="mt-4 pt-4 border-t">
                    {(() => {
                      const deviceAuths = (authorizations || []).filter(a => Array.isArray(a.smartlockIds) && a.smartlockIds.includes(device.smartlockId));
                      const activeCount = deviceAuths.filter(a => a.enabled).length;
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {deviceAuths.length} total keys, {activeCount} active
                            </span>
                          </div>
                          {deviceAuths.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {deviceAuths.map(a => (
                                <Badge key={a.id} variant={a.enabled ? 'default' : 'secondary'} className="text-xs">
                                  {a.name} • {a.typeName || 'Key'}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No keys found for this device</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            )) : (
              <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No devices found or failed to load devices</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="authorizations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Access Authorizations</h2>
            <Button onClick={fetchAllAuthorizations} variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Load All Authorizations
            </Button>
          </div>

          <div className="grid gap-4">
            {authorizations && authorizations.length > 0 ? authorizations.map((auth) => (
              <Card key={auth.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getAuthIcon(auth)}
                      <div>
                        <CardTitle className="text-lg">{auth.name}</CardTitle>
                        <CardDescription>{auth.typeName}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {auth.enabled ? (
                        <Badge variant="default">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                      {auth.isExpired && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                      {auth.hasTimeRestriction && (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          Time Limited
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Devices</p>
                      <p className="font-medium">{auth.smartlockIds ? auth.smartlockIds.length : 0} device(s)</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">{new Date(auth.creationDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Active</p>
                      <p className="font-medium">
                        {auth.lastActiveDate ? new Date(auth.lastActiveDate).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>

                  {auth.allowedFromDate && auth.allowedUntilDate && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Valid from {new Date(auth.allowedFromDate).toLocaleDateString()} to {new Date(auth.allowedUntilDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {auth.devices && Array.isArray(auth.devices) && auth.devices.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Authorized Devices:</p>
                      <div className="flex flex-wrap gap-2">
                        {auth.devices.map((device) => (
                          <Badge key={device.id} variant="outline" className="text-xs">
                            {device.name} ({device.state})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )) : (
              <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No authorizations found or failed to load authorizations</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Activity</h2>

          <div className="space-y-3">
            {recentActivity && recentActivity.length > 0 ? recentActivity.map((activity, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {activity.data?.actionName || 'Unknown Action'} on {activity.deviceName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          by {activity.name} • {activity.data?.triggerName || 'Unknown trigger'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{formatDate(activity.date)}</p>
                      {activity.data?.stateName && (
                        <Badge variant="outline" className="mt-1">
                          {activity.data.stateName}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No recent activity found or failed to load activity</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}