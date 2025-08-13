import { NextResponse } from 'next/server';

// In-memory log storage (simple solution for now)
// In production, you might want to store this in database
const webhookLogs: Array<{
  id: string;
  timestamp: string;
  eventType: string;
  status: 'success' | 'error';
  message: string;
  reservationId?: string;
  error?: string;
}> = [];

// Keep only last 100 logs to prevent memory issues
const MAX_LOGS = 100;

export async function GET() {
  try {
    // Return logs in reverse chronological order (newest first)
    const sortedLogs = [...webhookLogs].reverse();
    
    return NextResponse.json({
      success: true,
      logs: sortedLogs,
      count: sortedLogs.length
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

export async function POST(request: Request) {
  try {
    const logData = await request.json();
    
    const logEntry = {
      id: Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
      ...logData
    };
    
    // Add to logs
    webhookLogs.push(logEntry);
    
    // Keep only last MAX_LOGS entries
    if (webhookLogs.length > MAX_LOGS) {
      webhookLogs.splice(0, webhookLogs.length - MAX_LOGS);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Log entry added'
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
    // Clear all logs
    webhookLogs.length = 0;
    
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