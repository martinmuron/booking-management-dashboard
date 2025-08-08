import { NextResponse } from 'next/server';
import { nukiApiService } from '@/services/nuki-api.service';

// GET /api/nuki/test - Test Nuki API connection
export async function GET() {
  try {
    // Test connection by getting all devices
    const devices = await nukiApiService.getDevices();
    
    // Test device status check for all configured devices
    const deviceStatus = await nukiApiService.checkAllDevicesStatus();
    
    return NextResponse.json({
      success: true,
      data: {
        apiKey: process.env.NUKI_API_KEY ? 'Configured' : 'Missing',
        devicesFound: devices.length,
        devices: devices.map(device => ({
          id: device.smartlockId,
          name: device.name,
          type: device.type,
          serverState: device.serverState === 0 ? 'online' : 'offline',
          state: device.state,
        })),
        configuredDeviceStatus: deviceStatus,
        message: `Found ${devices.length} Nuki devices`
      }
    });
  } catch (error) {
    console.error('Nuki API test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      apiKey: process.env.NUKI_API_KEY ? 'Configured' : 'Missing',
    }, { status: 500 });
  }
}