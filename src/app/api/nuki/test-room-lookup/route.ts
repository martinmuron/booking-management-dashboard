import { NextRequest, NextResponse } from 'next/server';
import { nukiApiService } from '@/services/nuki-api.service';

// POST /api/nuki/test-room-lookup - SAFE READ-ONLY test to find room devices
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomNumber, guestName = "Test Guest" } = body;
    
    if (!roomNumber) {
      return NextResponse.json(
        { success: false, error: 'Room number is required for testing' },
        { status: 400 }
      );
    }

    // ⚠️ READ-ONLY OPERATIONS ONLY - NO CHANGES TO NUKI
    console.log('🔍 SAFE READ-ONLY TEST - No changes will be made to Nuki');

    // 1. Get all devices (READ-ONLY)
    const allDevices = await nukiApiService.getDevices();
    
    // 2. Find room device by number (READ-ONLY)
    const roomDevice = allDevices.find(device => device.name === roomNumber);
    
    // 3. Get configured common area devices (READ-ONLY)
    const mainEntranceId = process.env.NUKI_MAIN_ENTRANCE_ID;
    const luggageRoomId = process.env.NUKI_LUGGAGE_ROOM_ID;
    const laundryRoomId = process.env.NUKI_LAUNDRY_ROOM_ID;

    const mainEntranceDevice = allDevices.find(d => d.smartlockId.toString() === mainEntranceId);
    const luggageDevice = allDevices.find(d => d.smartlockId.toString() === luggageRoomId);
    const laundryDevice = allDevices.find(d => d.smartlockId.toString() === laundryRoomId);

    // Generate a simulated universal code (NOT sent to Nuki)
    const simulatedUniversalCode = Math.floor(100000 + Math.random() * 900000).toString();

    const result = {
      success: true,
      readOnlyTest: true,
      noChangesToNuki: true,
      requestedRoom: roomNumber,
      guestName,
      simulatedUniversalCode,
      
      // What we found in your Nuki system
      devices: {
        requestedRoom: roomDevice ? {
          found: true,
          id: roomDevice.smartlockId,
          name: roomDevice.name,
          status: roomDevice.serverState === 0 ? 'online' : 'offline',
          batteryLevel: roomDevice.state && typeof roomDevice.state === 'object' && 'batteryCharge' in roomDevice.state ? (roomDevice.state as { batteryCharge: number }).batteryCharge : 'unknown'
        } : {
          found: false,
          message: `Room "${roomNumber}" not found in Nuki devices`,
          availableRooms: allDevices
            .filter(d => /^\d+$/.test(d.name)) // Only room numbers
            .map(d => d.name)
            .sort()
        },

        mainEntrance: mainEntranceDevice ? {
          found: true,
          id: mainEntranceDevice.smartlockId,
          name: mainEntranceDevice.name,
          status: mainEntranceDevice.serverState === 0 ? 'online' : 'offline'
        } : { found: false },

        luggageRoom: luggageDevice ? {
          found: true,
          id: luggageDevice.smartlockId, 
          name: luggageDevice.name,
          status: luggageDevice.serverState === 0 ? 'online' : 'offline'
        } : { found: false },

        laundryRoom: laundryDevice ? {
          found: true,
          id: laundryDevice.smartlockId,
          name: laundryDevice.name,
          status: laundryDevice.serverState === 0 ? 'online' : 'offline'
        } : { found: false }
      },

      // What WOULD happen (simulation only)
      wouldCreate: roomDevice ? [
        `Universal code ${simulatedUniversalCode} for ${guestName}`,
        `Main entrance access (${mainEntranceDevice?.name || 'Not configured'})`,
        `Room ${roomNumber} access (${roomDevice.name})`, 
        `Luggage room access (${luggageDevice?.name || 'Not configured'})`,
        `Laundry room access (${laundryDevice?.name || 'Not configured'})`
      ] : [
        `❌ Cannot create keys - Room "${roomNumber}" not found in Nuki system`
      ],

      totalDevicesInSystem: allDevices.length
    };

    console.log('✅ READ-ONLY TEST COMPLETED - No changes made to Nuki');
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Read-only test error:', error);
    return NextResponse.json({
      success: false,
      readOnlyTest: true,
      error: error instanceof Error ? error.message : 'Test failed',
      message: 'No changes were made to Nuki system'
    }, { status: 500 });
  }
}