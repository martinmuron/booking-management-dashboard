import { NextRequest, NextResponse } from 'next/server';

const NUKI_BASE = 'https://api.nuki.io';

async function nukiFetch<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  const apiKey = process.env.NUKI_API_KEY;
  if (!apiKey) return null;
  
  try {
    const res = await fetch(`${NUKI_BASE}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!res.ok) {
      console.error(`Nuki API error: ${res.status} ${res.statusText}`);
      return null;
    }
    
    return await res.json() as T;
  } catch (error) {
    console.error('Nuki API request failed:', error);
    return null;
  }
}

// GET key details
export async function GET(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const { keyId } = params;
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    
    if (!deviceId) {
      return NextResponse.json(
        { success: false, message: 'Device ID is required' },
        { status: 400 }
      );
    }

    // Get key details from Nuki API
    const keyData = await nukiFetch<any>(`/smartlock/${deviceId}/auth/${keyId}`);
    
    if (!keyData) {
      return NextResponse.json(
        { success: false, message: 'Key not found or API error' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: keyData
    });

  } catch (error) {
    console.error('Error fetching key details:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST to update key (including revoke/enable)
export async function POST(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const { keyId } = params;
    const body = await request.json();
    const { deviceId, ...updateData } = body;
    
    if (!deviceId) {
      return NextResponse.json(
        { success: false, message: 'Device ID is required' },
        { status: 400 }
      );
    }

    // Update key via Nuki API
    const result = await nukiFetch<any>(`/smartlock/${deviceId}/auth/${keyId}`, {
      method: 'POST',
      body: JSON.stringify(updateData)
    });
    
    if (!result) {
      return NextResponse.json(
        { success: false, message: 'Failed to update key' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: updateData.enabled === false ? 'Key revoked successfully' : 'Key updated successfully',
      data: result
    });

  } catch (error) {
    console.error('Error updating key:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE key permanently
export async function DELETE(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const { keyId } = params;
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    
    if (!deviceId) {
      return NextResponse.json(
        { success: false, message: 'Device ID is required' },
        { status: 400 }
      );
    }

    // Delete key via Nuki API
    const result = await nukiFetch<any>(`/smartlock/${deviceId}/auth/${keyId}`, {
      method: 'DELETE'
    });
    
    return NextResponse.json({
      success: true,
      message: 'Key deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting key:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}