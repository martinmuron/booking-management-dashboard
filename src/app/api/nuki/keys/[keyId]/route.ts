import { NextRequest, NextResponse } from 'next/server';

const NUKI_BASE = 'https://api.nuki.io';

async function nukiFetch<T>(path: string, options: RequestInit = {}): Promise<{ ok: true; data: T | null } | { ok: false; status: number; statusText: string }> {
  const apiKey = process.env.NUKI_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 401, statusText: 'NUKI_API_KEY missing' };
  }
  
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
      return { ok: false, status: res.status, statusText: res.statusText };
    }

    if (res.status === 204) {
      return { ok: true, data: null };
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = (await res.json()) as T;
      return { ok: true, data };
    }

    return { ok: true, data: null };
  } catch (error) {
    console.error('Nuki API request failed:', error);
    return { ok: false, status: 500, statusText: 'Fetch error' };
  }
}

// GET key details
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ keyId: string }> }
) {
  try {
    const { keyId } = await context.params;
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    
    if (!deviceId) {
      return NextResponse.json(
        { success: false, message: 'Device ID is required' },
        { status: 400 }
      );
    }

    // Get key details from Nuki API
    const keyData = await nukiFetch<Record<string, unknown>>(`/smartlock/${deviceId}/auth/${keyId}`);

    if (!keyData.ok || !keyData.data) {
      return NextResponse.json(
        { success: false, message: 'Key not found or API error' },
        { status: keyData.ok ? 404 : keyData.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: keyData.data
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
  context: { params: Promise<{ keyId: string }> }
) {
  try {
    const { keyId } = await context.params;
    const body = await request.json();
    const { deviceId, ...updateData } = body;
    
    if (!deviceId) {
      return NextResponse.json(
        { success: false, message: 'Device ID is required' },
        { status: 400 }
      );
    }

    // Update key via Nuki API
    const result = await nukiFetch<Record<string, unknown>>(`/smartlock/${deviceId}/auth/${keyId}`, {
      method: 'POST',
      body: JSON.stringify(updateData)
    });
    
    if (!result.ok) {
      return NextResponse.json(
        { success: false, message: 'Failed to update key' },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: updateData.enabled === false ? 'Key revoked successfully' : 'Key updated successfully',
      data: result.data
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
  context: { params: Promise<{ keyId: string }> }
) {
  try {
    const { keyId } = await context.params;
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    
    if (!deviceId) {
      return NextResponse.json(
        { success: false, message: 'Device ID is required' },
        { status: 400 }
      );
    }

    // Delete key via Nuki API
    const result = await nukiFetch<Record<string, unknown>>(`/smartlock/${deviceId}/auth/${keyId}`, {
      method: 'DELETE'
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, message: 'Failed to delete key' },
        { status: result.status }
      );
    }
    
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
