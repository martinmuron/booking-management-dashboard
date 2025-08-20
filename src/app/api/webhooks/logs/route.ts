import { NextResponse } from 'next/server';
import { getWebhookLogs, clearWebhookLogs } from '@/lib/webhook-logs';

export async function GET() {
  try {
    const webhookLogs = await getWebhookLogs();
    
    // Convert Date objects to ISO strings for JSON serialization
    const serializedLogs = webhookLogs.map(log => ({
      ...log,
      timestamp: log.createdAt.toISOString() // Add timestamp field for UI compatibility
    }));
    
    return NextResponse.json({
      success: true,
      logs: serializedLogs,
      count: serializedLogs.length
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // This endpoint is no longer used since logs are created directly in the webhook route
    return NextResponse.json({
      success: false,
      message: 'Logs are now created directly in webhook processing'
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // Clear all logs using the shared module
    await clearWebhookLogs();
    
    return NextResponse.json({
      success: true,
      message: 'All webhook logs cleared'
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}