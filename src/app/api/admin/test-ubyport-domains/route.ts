import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🌐 Testing different UbyPort domain variations...');

    const domainVariations = [
      'https://ubyport.policie.cz',
      'https://ubyport.policie.cz:443',
      'https://ws.ubyport.policie.cz',
      'https://api.ubyport.policie.cz',
      'https://webservice.ubyport.policie.cz',
      'https://ubyport2.policie.cz',
      'https://new.ubyport.policie.cz',
      'https://v2.ubyport.policie.cz',
      'https://ubyport.pcr.cz', // old domain for comparison
    ];

    const results = [];

    for (const domain of domainVariations) {
      console.log(`Testing domain: ${domain}`);

      try {
        // Simple GET request to check if domain is accessible
        const response = await fetch(domain, {
          method: 'GET',
          headers: {
            'User-Agent': 'UbyPort-Client/1.0'
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout for slow connections
        });

        const responseText = await response.text();

        results.push({
          domain: domain,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          bodyPreview: responseText.substring(0, 500),
          accessible: response.status < 400,
          responseLength: responseText.length
        });

        console.log(`Domain ${domain}: ${response.status} ${response.statusText} (${responseText.length} bytes)`);

      } catch (error) {
        results.push({
          domain: domain,
          error: error instanceof Error ? error.message : 'Unknown error',
          accessible: false
        });

        console.log(`Domain ${domain}: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Sort by accessibility (accessible domains first)
    results.sort((a, b) => (b.accessible ? 1 : 0) - (a.accessible ? 1 : 0));

    return NextResponse.json({
      success: true,
      message: 'Tested UbyPort domain variations',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error testing UbyPort domains:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test UbyPort domains',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}