import { NextRequest, NextResponse } from 'next/server';

// POST /api/nuki/simulate-keys - Simulate key generation (no actual Nuki calls)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guestName, roomNumber, checkInDate, checkOutDate } = body;
    
    if (!guestName || !roomNumber || !checkInDate || !checkOutDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate a simulated universal keypad code
    const universalKeypadCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Simulate what would happen with real Nuki API
    const simulatedResults = [
      {
        keyType: 'MAIN_ENTRANCE',
        nukiKeyId: `sim_main_${universalKeypadCode}`,
        name: `${guestName} - Main Entrance - ${universalKeypadCode}`,
        deviceId: '17958559348', // Borivojova Entry door
        deviceName: 'Borivojova Entry door',
      },
      {
        keyType: 'ROOM',
        nukiKeyId: `sim_room_${universalKeypadCode}`,
        name: `${guestName} - Room ${roomNumber} - ${universalKeypadCode}`,
        deviceId: 'dynamic', // Would be looked up based on room number
        deviceName: roomNumber,
      },
      {
        keyType: 'LUGGAGE_ROOM',
        nukiKeyId: `sim_luggage_${universalKeypadCode}`,
        name: `${guestName} - Luggage Room - ${universalKeypadCode}`,
        deviceId: '18154937741', // Luggage
        deviceName: 'Luggage',
      },
      {
        keyType: 'LAUNDRY_ROOM',
        nukiKeyId: `sim_laundry_${universalKeypadCode}`,
        name: `${guestName} - Laundry Room - ${universalKeypadCode}`,
        deviceId: '18090678500', // Laundry
        deviceName: 'Laundry',
      },
    ];

    return NextResponse.json({
      success: true,
      simulation: true,
      data: {
        universalKeypadCode,
        guestName,
        roomNumber,
        checkInDate,
        checkOutDate,
        keys: simulatedResults,
        message: `🔐 Universal Code: ${universalKeypadCode}`,
        instructions: [
          `Guest ${guestName} gets ONE code: ${universalKeypadCode}`,
          `This code works on ALL 4 doors:`,
          `• Main entrance (${simulatedResults[0].deviceName})`,
          `• Their room (${roomNumber})`,
          `• Luggage room`,
          `• Laundry room`,
          `Active from ${checkInDate} to ${checkOutDate}`,
        ],
      },
    });
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Simulation failed' },
      { status: 500 }
    );
  }
}