import { NextResponse } from 'next/server';
import { nukiService } from '@/services/nuki.service';

export async function GET() {
  try {
    console.log('🔐 Fetching Nuki overview data');

    const [stats, devices, auths] = await Promise.all([
      nukiService.getOverviewStats(),
      nukiService.getAllDevices(),
      nukiService.getAllAuthorizations()
    ]);

    // Get recent activity from all devices
    const recentActivity = [];
    for (const device of devices) {
      try {
        const logs = await nukiService.getDeviceLogs(device.smartlockId, 5);
        recentActivity.push(...logs.map(log => ({
          ...log,
          deviceName: device.name,
          deviceId: device.smartlockId
        })));
      } catch (error) {
        console.warn(`Could not fetch logs for device ${device.smartlockId}:`, error);
      }
    }

    // Sort recent activity by date (most recent first)
    recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const overviewData = {
      stats,
      devices: devices.slice(0, 5), // First 5 devices for overview
      recentActivity: recentActivity.slice(0, 10), // Last 10 activities
      authorizations: auths.slice(0, 10) // First 10 authorizations for overview
    };

    return NextResponse.json({
      success: true,
      data: overviewData
    });

  } catch (error) {
    console.error('❌ Error fetching Nuki overview:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to fetch Nuki overview data'
    }, { status: 500 });
  }
}