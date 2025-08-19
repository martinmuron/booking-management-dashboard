'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Lock, 
  Unlock, 
  Wifi, 
  WifiOff, 
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
  RefreshCw,
  Plus,
  UserX,
  Info,
  Calendar,
  Clock as ClockIcon,
  ArrowLeft,
  Trash2
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
}

interface KeyEntry {
  id: number;
  name: string;
  isActive: boolean;
  type: number;
  typeName?: string;
  deviceId: number;
  deviceName?: string;
  isExpired?: boolean;
  enabled?: boolean;
  creationDate?: string;
  lastActiveDate?: string;
  allowedFromDate?: string;
  allowedUntilDate?: string;
  allowedWeekDays?: number;
  allowedWeekDaysDecoded?: string[];
  allowedFromTime?: number;
  allowedUntilTime?: number;
}

export default function NukiManagementPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<NukiStats | null>(null);
  const [devices, setDevices] = useState<NukiDevice[]>([]);
  const [authorizations, setAuthorizations] = useState<NukiAuth[]>([]);
  const [keys, setKeys] = useState<KeyEntry[]>([]);
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
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [selectedKey, setSelectedKey] = useState<KeyEntry | null>(null);
  const [showKeyDetails, setShowKeyDetails] = useState(false);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<KeyEntry | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<KeyEntry | null>(null);

  const fetchOverviewData = async () => {
    try {
      setError(null);
      const [overviewRes, keysRes] = await Promise.all([
        fetch('/api/nuki/overview'),
        fetch('/api/nuki/keys')
      ]);
      const result = await overviewRes.json();
      const keysJson = await keysRes.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch Nuki data');
      }

      const { stats: overviewStats, devices: overviewDevices, recentActivity: activity, authorizations: auths } = result.data || {};
      
      setStats(overviewStats || null);
      setDevices(overviewDevices || []);
      setRecentActivity(activity || []);
      setAuthorizations(auths || []);
      setKeys(Array.isArray(keysJson?.data) ? keysJson.data as KeyEntry[] : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      // Set empty defaults on error
      setStats(null);
      setDevices([]);
      setRecentActivity([]);
      setAuthorizations([]);
      setKeys([]);
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

  const handleRevokeKey = async (key: KeyEntry) => {
    try {
      const response = await fetch(`/api/nuki/keys/${key.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          deviceId: key.deviceId,
          enabled: false 
        })
      });
      
      if (response.ok) {
        // Immediately update the key in local state for instant UI feedback
        setKeys(prevKeys => prevKeys.map(k => 
          k.id === key.id 
            ? { ...k, isActive: false, enabled: false }
            : k
        ));
        
        // Also refresh all data to ensure consistency
        fetchOverviewData();
        
        setShowRevokeConfirm(false);
        setKeyToRevoke(null);
      } else {
        console.error('Failed to revoke key');
      }
    } catch (error) {
      console.error('Error revoking key:', error);
    }
  };

  const handleDeleteKey = async (key: KeyEntry) => {
    try {
      const response = await fetch(`/api/nuki/keys/${key.id}?deviceId=${key.deviceId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Immediately remove the key from the local state for instant UI update
        setKeys(prevKeys => prevKeys.filter(k => k.id !== key.id));
        
        // Also refresh all data to ensure consistency
        fetchOverviewData();
        
        // Close dialogs
        setShowDeleteConfirm(false);
        setKeyToDelete(null);
        setShowKeyDetails(false);
      } else {
        console.error('Failed to delete key');
      }
    } catch (error) {
      console.error('Error deleting key:', error);
    }
  };

  const handleCreateKey = async (formData: {
    name: string;
    accountUserId: string;
    type?: number;
    remoteAllowed?: boolean;
    code?: string;
  }) => {
    try {
      const response = await fetch(`/api/nuki/devices/${selectedDevice}/keys`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        // Refresh the key data
        fetchOverviewData();
        setShowCreateKey(false);
      } else {
        console.error('Failed to create key');
      }
    } catch (error) {
      console.error('Error creating key:', error);
    }
  };

  const openKeyDetails = (key: KeyEntry) => {
    setSelectedKey(key);
    setShowKeyDetails(true);
  };

  const formatTimeRestriction = (fromTime?: number, untilTime?: number) => {
    if (!fromTime || !untilTime) return null;
    
    const formatTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };
    
    return `${formatTime(fromTime)} - ${formatTime(untilTime)}`;
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

  // Battery UI removed per requirements

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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
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
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Nuki Management</h1>
            <p className="text-gray-600">Manage your Nuki smart locks and access control</p>
          </div>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAuthorizations}</div>
              <p className="text-xs text-muted-foreground">
                All access keys
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Key Status</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {keys.filter(k => k.isActive).length}
              </div>
              <p className="text-xs text-muted-foreground">
                {keys.filter(k => (k as KeyEntry & { isExpired?: boolean }).isExpired).length} expired/inactive
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
          {selectedDevice ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedDevice(null)}
                  className="flex items-center gap-2"
                >
                  ← Back to Devices
                </Button>
                <div>
                  <h2 className="text-xl font-semibold">
                    {devices.find(d => d.smartlockId === selectedDevice)?.name || 'Device'} - Access Keys
                  </h2>
                  <p className="text-muted-foreground">Manage access keys for this smart lock</p>
                </div>
              </div>

              {(() => {
                const deviceAuths = (keys || []).filter((k: KeyEntry) => k.deviceId === selectedDevice);
                const activeCount = deviceAuths.filter((a: KeyEntry) => a.isActive).length;
                const expiredCount = deviceAuths.filter((a: KeyEntry) => a.isExpired).length;
                
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Total Keys</p>
                              <p className="text-2xl font-bold">{deviceAuths.length}</p>
                            </div>
                            <Key className="h-8 w-8 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Active Keys</p>
                              <p className="text-2xl font-bold text-green-600">{activeCount}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-600" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Expired Keys</p>
                              <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
                            </div>
                            <XCircle className="h-8 w-8 text-red-600" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Access Keys</CardTitle>
                            <CardDescription>
                              All access keys for this device. Click any key to view details, or use the actions to manage keys.
                            </CardDescription>
                          </div>
                          <Button 
                            onClick={() => setShowCreateKey(true)}
                            className="flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Create Key
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {deviceAuths.length > 0 ? (
                          <div className="space-y-3">
                            {deviceAuths.map((auth: KeyEntry) => (
                              <Card key={auth.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => openKeyDetails(auth)}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                                      {auth.type === 0 && <Smartphone className="h-5 w-5 text-blue-500" />}
                                      {(auth.type === 3 || auth.type === 13) && <Key className="h-5 w-5 text-amber-500" />}
                                      {auth.type !== 0 && auth.type !== 3 && auth.type !== 13 && <Shield className="h-5 w-5 text-gray-500" />}
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-medium">{auth.name}</p>
                                      <p className="text-sm text-muted-foreground">{auth.typeName || 'Authorization'}</p>
                                      {auth.allowedUntilDate && (
                                        <p className="text-xs text-muted-foreground">
                                          Expires: {new Date(auth.allowedUntilDate).toLocaleDateString()}
                                        </p>
                                      )}
                                      {auth.allowedWeekDaysDecoded && auth.allowedWeekDaysDecoded.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                          Days: {auth.allowedWeekDaysDecoded.join(', ')}
                                        </p>
                                      )}
                                      {formatTimeRestriction(auth.allowedFromTime, auth.allowedUntilTime) && (
                                        <p className="text-xs text-muted-foreground">
                                          Time: {formatTimeRestriction(auth.allowedFromTime, auth.allowedUntilTime)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {auth.isActive ? (
                                      <Badge variant="default" className="flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" />
                                        Active
                                      </Badge>
                                    ) : auth.isExpired ? (
                                      <Badge variant="destructive" className="flex items-center gap-1">
                                        <XCircle className="h-3 w-3" />
                                        Expired
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Inactive
                                      </Badge>
                                    )}
                                    
                                    {auth.isActive && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setKeyToRevoke(auth);
                                          setShowRevokeConfirm(true);
                                        }}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <UserX className="h-4 w-4" />
                                      </Button>
                                    )}
                                    
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openKeyDetails(auth);
                                      }}
                                    >
                                      <Info className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium mb-2">No access keys found</p>
                            <p>This device doesn&apos;t have any access keys configured.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Smart Lock Devices</h2>
                <Button onClick={fetchAllDevices} variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Load All Devices
                </Button>
              </div>

              <div className="grid gap-4">
                {devices && devices.length > 0 ? devices.map((device) => {
                  const deviceAuths = (keys || []).filter((k: KeyEntry) => k.deviceId === device.smartlockId);
                  const activeCount = deviceAuths.filter((a: KeyEntry) => a.isActive).length;
                  const expiredCount = deviceAuths.filter((a: KeyEntry) => a.isExpired).length;
                  
                  return (
                    <Card key={device.smartlockId} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                              {getDeviceIcon(device)}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold">{device.name}</h3>
                              <p className="text-sm text-muted-foreground">{device.deviceTypeName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={getStatusColor(device.state, device.serverState)} className="text-xs">
                                  {device.stateName}
                                </Badge>
                                {device.serverState === 0 ? (
                                  <Badge variant="outline" className="text-green-600 text-xs">
                                    <Wifi className="h-3 w-3 mr-1" />
                                    Online
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs">
                                    <WifiOff className="h-3 w-3 mr-1" />
                                    Offline
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="flex items-center gap-4 mb-2">
                              <div className="text-center">
                                <p className="text-sm text-muted-foreground">Battery</p>
                                <p className="font-medium flex items-center gap-1">
                                  {device.batteryChargeState || 0}%
                                  {device.batteryCharging && <span className="text-green-600 text-xs">⚡</span>}
                                  {device.batteryCritical && <span className="text-red-600 text-xs">⚠️</span>}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm text-muted-foreground">Keys</p>
                                <p className="font-medium">
                                  <span className="text-green-600">{activeCount}</span> / {deviceAuths.length}
                                </p>
                                {expiredCount > 0 && (
                                  <p className="text-xs text-red-600">{expiredCount} expired</p>
                                )}
                              </div>
                            </div>
                            
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDevice(device.smartlockId);
                              }}
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              Access Keys
                              <Key className="h-4 w-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }) : (
                  <Card>
                    <CardContent className="pt-8 pb-8 text-center">
                      <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No devices found or failed to load devices</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
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

      {/* Key Details Dialog */}
      <Dialog open={showKeyDetails} onOpenChange={setShowKeyDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Access Key Details</DialogTitle>
            <DialogDescription>
              Complete information about this access key
            </DialogDescription>
          </DialogHeader>
          
          {selectedKey && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                  <p className="text-base font-medium">{selectedKey.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                  <div className="flex items-center gap-2">
                    {selectedKey.type === 0 && <Smartphone className="h-4 w-4 text-blue-500" />}
                    {(selectedKey.type === 3 || selectedKey.type === 13) && <Key className="h-4 w-4 text-amber-500" />}
                    {selectedKey.type !== 0 && selectedKey.type !== 3 && selectedKey.type !== 13 && <Shield className="h-4 w-4 text-gray-500" />}
                    <span>{selectedKey.typeName || 'Authorization'}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="flex items-center gap-2">
                    {selectedKey.isActive ? (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                    ) : selectedKey.isExpired ? (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Expired
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Key ID</Label>
                  <p className="text-base font-mono">{selectedKey.id}</p>
                </div>
              </div>

              {/* Time Restrictions */}
              {(selectedKey.allowedFromDate || selectedKey.allowedUntilDate || selectedKey.allowedWeekDaysDecoded?.length || formatTimeRestriction(selectedKey.allowedFromTime, selectedKey.allowedUntilTime)) && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Time Restrictions
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedKey.allowedFromDate && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Valid From</Label>
                        <p>{new Date(selectedKey.allowedFromDate).toLocaleString()}</p>
                      </div>
                    )}
                    {selectedKey.allowedUntilDate && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Valid Until</Label>
                        <p>{new Date(selectedKey.allowedUntilDate).toLocaleString()}</p>
                      </div>
                    )}
                    {selectedKey.allowedWeekDaysDecoded && selectedKey.allowedWeekDaysDecoded.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Allowed Days</Label>
                        <p>{selectedKey.allowedWeekDaysDecoded.join(', ')}</p>
                      </div>
                    )}
                    {formatTimeRestriction(selectedKey.allowedFromTime, selectedKey.allowedUntilTime) && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Allowed Hours</Label>
                        <p>{formatTimeRestriction(selectedKey.allowedFromTime, selectedKey.allowedUntilTime)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Activity Information */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <ClockIcon className="h-4 w-4" />
                  Activity Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedKey.creationDate && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Created</Label>
                      <p>{new Date(selectedKey.creationDate).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedKey.lastActiveDate && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Last Active</Label>
                      <p>{new Date(selectedKey.lastActiveDate).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {selectedKey && (!selectedKey.isActive || selectedKey.isExpired) && (
            <DialogFooter className="mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowKeyDetails(false)}
              >
                Close
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  setKeyToDelete(selectedKey);
                  setShowDeleteConfirm(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Key
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Key Dialog */}
      <Dialog open={showCreateKey} onOpenChange={setShowCreateKey}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Access Key</DialogTitle>
            <DialogDescription>
              Create a new access key for this smart lock device
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            handleCreateKey({
              name: formData.get('name') as string,
              accountUserId: formData.get('accountUserId') as string,
              type: parseInt(formData.get('type') as string) || 0,
              remoteAllowed: formData.get('remoteAllowed') === 'true',
              code: formData.get('code') as string || undefined,
            });
          }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Key Name *</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="Enter key name" 
                  required 
                />
              </div>
              
              <div>
                <Label htmlFor="accountUserId">Account User ID *</Label>
                <Input 
                  id="accountUserId" 
                  name="accountUserId" 
                  placeholder="Enter user account ID" 
                  required 
                />
              </div>
              
              <div>
                <Label htmlFor="type">Key Type</Label>
                <Select name="type" defaultValue="0">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">App User</SelectItem>
                    <SelectItem value="3">Keypad Code</SelectItem>
                    <SelectItem value="13">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="code">Keypad Code (optional)</Label>
                <Input 
                  id="code" 
                  name="code" 
                  placeholder="Enter 6-digit code for keypad" 
                  maxLength={6}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="remoteAllowed" 
                  name="remoteAllowed" 
                  value="true"
                />
                <Label htmlFor="remoteAllowed">Allow remote access</Label>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowCreateKey(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Key</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={showRevokeConfirm} onOpenChange={setShowRevokeConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Access Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke this access key? This action will disable the key but not delete it permanently.
            </DialogDescription>
          </DialogHeader>
          
          {keyToRevoke && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background">
                  {keyToRevoke.type === 0 && <Smartphone className="h-5 w-5 text-blue-500" />}
                  {(keyToRevoke.type === 3 || keyToRevoke.type === 13) && <Key className="h-5 w-5 text-amber-500" />}
                  {keyToRevoke.type !== 0 && keyToRevoke.type !== 3 && keyToRevoke.type !== 13 && <Shield className="h-5 w-5 text-gray-500" />}
                </div>
                <div>
                  <p className="font-medium">{keyToRevoke.name}</p>
                  <p className="text-sm text-muted-foreground">{keyToRevoke.typeName || 'Authorization'}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => keyToRevoke && handleRevokeKey(keyToRevoke)}
            >
              Revoke Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Access Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this access key? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {keyToDelete && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background">
                  {keyToDelete.type === 0 && <Smartphone className="h-5 w-5 text-blue-500" />}
                  {(keyToDelete.type === 3 || keyToDelete.type === 13) && <Key className="h-5 w-5 text-amber-500" />}
                  {keyToDelete.type !== 0 && keyToDelete.type !== 3 && keyToDelete.type !== 13 && <Shield className="h-5 w-5 text-gray-500" />}
                </div>
                <div>
                  <p className="font-medium">{keyToDelete.name}</p>
                  <p className="text-sm text-muted-foreground">{keyToDelete.typeName || 'Authorization'}</p>
                  {keyToDelete.isExpired && (
                    <Badge variant="destructive" className="text-xs mt-1">
                      <XCircle className="h-3 w-3 mr-1" />
                      Expired
                    </Badge>
                  )}
                  {!keyToDelete.isActive && !keyToDelete.isExpired && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => keyToDelete && handleDeleteKey(keyToDelete)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}