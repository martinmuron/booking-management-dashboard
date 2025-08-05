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
    const token = authData.access_token;
    console.log('✅ Authentication successful, testing endpoints...');

    // Test multiple endpoints to see what's available
    const results: {
      credentials: { hasApiKey: boolean; hasAccountId: boolean };
      endpoints: Record<string, unknown>;
    } = {
      credentials: { hasApiKey: !!apiKey, hasAccountId: !!accountId },
      endpoints: {}
    };

    const testEndpoints = [
      { name: 'listings', url: '/listings?limit=10' },
      { name: 'reservations_no_filter', url: '/reservations?limit=10' },
      { name: 'reservations_with_dates', url: `/reservations?limit=10&checkInDateFrom=2024-01-01&checkInDateTo=2025-12-31` },
      { name: 'reservations_future', url: `/reservations?limit=10&checkInDateFrom=${new Date().toISOString().split('T')[0]}` },
      { name: 'reservations_past', url: `/reservations?limit=10&checkInDateTo=${new Date().toISOString().split('T')[0]}` },
      { name: 'account_info', url: '/me' }
    ];

    for (const endpoint of testEndpoints) {
      try {
        console.log(`🔍 Testing ${endpoint.name}:`, endpoint.url);
        
        const response = await fetch(`https://api.hostaway.com/v1${endpoint.url}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-control': 'no-cache',
          }
        });

        if (response.ok) {
          const data = await response.json();
          results.endpoints[endpoint.name] = {
            status: 'success',
            count: data.result?.length || 0,
            totalCount: data.count || 0,
            sampleData: data.result?.slice(0, 3) || []
          };
          console.log(`✅ ${endpoint.name}: ${data.result?.length || 0} items (total: ${data.count || 0})`);
        } else {
          const errorText = await response.text();
          results.endpoints[endpoint.name] = {
            status: 'error',
            httpStatus: response.status,
            error: response.statusText,
            details: errorText
          };
          console.log(`❌ ${endpoint.name}: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        results.endpoints[endpoint.name] = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        console.log(`❌ ${endpoint.name}: ${error}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'HostAway API exploration complete',
      results,
      timestamp: new Date().toISOString()
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