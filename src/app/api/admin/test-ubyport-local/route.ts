import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🧪 Testing UbyPort connection with hardcoded credentials...');

    // Hardcoded credentials for local testing
    const username = 'ub2473734';
    const password = '6[UOw1n)';

    // Create SOAP envelope for TestDostupnosti method
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:uby="http://UBY.pcr.cz/WS_UBY">
  <soap:Header />
  <soap:Body>
    <uby:TestDostupnosti>
      <uby:AutentificationCode>X</uby:AutentificationCode>
    </uby:TestDostupnosti>
  </soap:Body>
</soap:Envelope>`;

    const apiUrl = 'https://ubyport.pcr.cz/ws_uby/ws_uby.svc';
    const soapAction = 'http://UBY.pcr.cz/WS_UBY/IWS_UBY/TestDostupnosti';

    // Try basic authentication
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

    console.log('Making request to:', apiUrl);
    console.log('Username length:', username.length);
    console.log('Password length:', password.length);
    console.log('Basic auth header:', `Basic ${basicAuth.substring(0, 20)}...`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': soapAction,
        'Authorization': `Basic ${basicAuth}`,
        'User-Agent': 'UbyPort-Client/1.0'
      },
      body: soapEnvelope
    });

    const responseText = await response.text();

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response body preview:', responseText.substring(0, 500));

    const debugInfo = {
      requestUrl: apiUrl,
      requestMethod: 'POST',
      requestHeaders: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': soapAction,
        'Authorization': `Basic ${basicAuth.substring(0, 20)}...`,
        'User-Agent': 'UbyPort-Client/1.0'
      },
      responseStatus: response.status,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      responseBodyLength: responseText.length,
      responseBodyPreview: responseText.substring(0, 500),
      credentials: {
        username,
        usernameLength: username.length,
        passwordLength: password.length,
        usernameHex: Buffer.from(username).toString('hex'),
        passwordHex: Buffer.from(password).toString('hex')
      }
    };

    if (response.status === 200) {
      const isSuccess = responseText.includes('<TestDostupnostiResult>true</TestDostupnostiResult>');
      return NextResponse.json({
        success: isSuccess,
        message: isSuccess ? 'UbyPort API connection successful' : 'UbyPort API returned false',
        debug: debugInfo,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `HTTP error ${response.status}`,
        debug: debugInfo,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error testing UbyPort connection:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test UbyPort connection',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
