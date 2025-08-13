// Shared webhook logging system

interface WebhookLog {
  id: string;
  timestamp: string;
  eventType: string;
  status: 'success' | 'error';
  message: string;
  reservationId?: string;
  error?: string;
}

// In-memory log storage
const webhookLogs: WebhookLog[] = [];
const MAX_LOGS = 100;

// Add a log entry
export function addWebhookLog(data: {
  eventType: string;
  status: 'success' | 'error';
  message: string;
  reservationId?: string;
  error?: string;
}) {
  try {
    const logEntry: WebhookLog = {
      id: Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
      ...data
    };
    
    // Add to logs
    webhookLogs.push(logEntry);
    
    // Keep only last MAX_LOGS entries
    if (webhookLogs.length > MAX_LOGS) {
      webhookLogs.splice(0, webhookLogs.length - MAX_LOGS);
    }
    
    console.log('📝 Webhook logged:', logEntry);
    return logEntry;
  } catch (error) {
    console.error('Failed to log webhook activity:', error);
    return null;
  }
}

// Get all logs
export function getWebhookLogs(): WebhookLog[] {
  return [...webhookLogs];
}

// Clear all logs
export function clearWebhookLogs(): void {
  webhookLogs.length = 0;
}