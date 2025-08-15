import { NextRequest, NextResponse } from 'next/server';
import { nukiService } from '@/services/nuki.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deviceId = parseInt(id);
  
  try {
    if (isNaN(deviceId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid device ID'
      }, { status: 400 });
    }

    console.log(`🔐 Fetching Nuki device details for ${deviceId}`);

    const [device, logs, auths] = await Promise.all([
      nukiService.getDevice(deviceId),
      nukiService.getDeviceLogs(deviceId, 50),
      nukiService.getDeviceAuthorizations(deviceId)
    ]);

    const deviceDetails = {
      ...device,
      logs,
      authorizations: auths,
      authStats: {
        total: auths.length,
        active: auths.filter(a => a.enabled).length,
        inactive: auths.filter(a => !a.enabled).length,
        byType: auths.reduce((acc, auth) => {
          const typeName = auth.typeName || 'Unknown';
          acc[typeName] = (acc[typeName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      logStats: {
        total: logs.length,
        byAction: logs.reduce((acc, log) => {
          const actionName = log.data.actionName || 'Unknown';
          acc[actionName] = (acc[actionName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    };

    return NextResponse.json({
      success: true,
      data: deviceDetails
    });

  } catch (error) {
    console.error(`❌ Error fetching Nuki device ${id}:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: `Failed to fetch device ${id}`
    }, { status: 500 });
  }
}