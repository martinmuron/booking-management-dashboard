import { NextResponse } from 'next/server';
import { nukiService } from '@/services/nuki.service';

export async function GET() {
  try {
    console.log('🔐 Fetching all Nuki devices');

    const devices = await nukiService.getAllDevices();

    // Get additional details for each device
    const devicesWithDetails = await Promise.all(
      devices.map(async (device) => {
        try {
          const [logs, auths] = await Promise.all([
            nukiService.getDeviceLogs(device.smartlockId, 10),
            nukiService.getDeviceAuthorizations(device.smartlockId)
          ]);

          return {
            ...device,
            recentLogs: logs,
            authorizations: auths,
            authCount: auths.length,
            activeAuthCount: auths.filter(a => a.enabled).length
          };
        } catch (error) {
          console.warn(`Could not fetch details for device ${device.smartlockId}:`, error);
          return {
            ...device,
            recentLogs: [],
            authorizations: [],
            authCount: 0,
            activeAuthCount: 0
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: devicesWithDetails,
      count: devicesWithDetails.length
    });

  } catch (error) {
    console.error('❌ Error fetching Nuki devices:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to fetch Nuki devices'
    }, { status: 500 });
  }
}