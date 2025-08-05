import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test basic HostAway auth
    const apiKey = process.env.HOSTAWAY_API_KEY;
    const accountId = process.env.HOSTAWAY_ACCOUNT_ID;

    console.log('API Key exists:', !!apiKey);
    console.log('Account ID exists:', !!accountId);

    if (!apiKey || !accountId) {
      return NextResponse.json({
        success: false,
        error: 'Missing API credentials',
        details: {
          hasApiKey: !!apiKey,
          hasAccountId: !!accountId
        }
      });
    }

    // Test auth endpoint with timeout
    console.log('Testing HostAway auth...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const authResponse = await fetch('https://api.hostaway.com/v1/accessTokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-control': 'no-cache',
      },
      body: `grant_type=client_credentials&client_id=${accountId}&client_secret=${apiKey}&scope=general`,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    const authText = await authResponse.text();
    console.log('Auth response status:', authResponse.status);
    console.log('Auth response:', authText);

    if (!authResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'HostAway auth failed',
        status: authResponse.status,
        response: authText
      });
    }

    const authData = JSON.parse(authText);
    
    return NextResponse.json({
      success: true,
      message: 'HostAway auth successful',
      tokenReceived: !!authData.access_token,
      expiresIn: authData.expires_in
    });

  } catch (error) {
    console.error('HostAway test error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}