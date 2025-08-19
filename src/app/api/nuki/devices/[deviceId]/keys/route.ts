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

// PUT to create new key
export async function PUT(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  try {
    const { deviceId } = params;
    const body = await request.json();
    
    // Validate required fields
    if (!body.accountUserId || !body.name) {
      return NextResponse.json(
        { success: false, message: 'accountUserId and name are required' },
        { status: 400 }
      );
    }

    // Create key via Nuki API
    const result = await nukiFetch<any>(`/smartlock/${deviceId}/auth`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
    
    if (!result) {
      return NextResponse.json(
        { success: false, message: 'Failed to create key' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Key created successfully',
      data: result
    });

  } catch (error) {
    console.error('Error creating key:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}