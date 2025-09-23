import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing different UbyPort endpoint variations...');

    const baseUrl = 'https://ubyport.policie.cz';
    const endpointVariations = [
      '/ws_uby/ws_uby.svc',
      '/ws_uby.svc',
      '/WS_UBY/WS_UBY.svc',
      '/ws_uby',
      '/WS_UBY',
      '/service/ws_uby.svc',
      '/services/ws_uby.svc'
    ];

    const results = [];

    for (const endpoint of endpointVariations) {
      const fullUrl = `${baseUrl}${endpoint}`;
      console.log(`Testing endpoint: ${fullUrl}`);

      try {
        // Simple GET request to check if endpoint exists
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'UbyPort-Client/1.0'
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        results.push({
          endpoint: endpoint,
          url: fullUrl,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          accessible: response.status !== 404
        });

        console.log(`Endpoint ${endpoint}: ${response.status} ${response.statusText}`);

      } catch (error) {
        results.push({
          endpoint: endpoint,
          url: fullUrl,
          error: error instanceof Error ? error.message : 'Unknown error',
          accessible: false
        });

        console.log(`Endpoint ${endpoint}: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Sort by accessibility (accessible endpoints first)
    results.sort((a, b) => (b.accessible ? 1 : 0) - (a.accessible ? 1 : 0));

    return NextResponse.json({
      success: true,
      message: 'Tested UbyPort endpoint variations',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error testing UbyPort endpoints:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test UbyPort endpoints',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}