// Database-based webhook logging system

import { prisma } from './database';

interface WebhookLogData {
  eventType: string;
  status: 'success' | 'error';
  message: string;
  reservationId?: string;
  error?: string;
}

interface WebhookLog {
  id: string;
  eventType: string;
  status: string;
  message: string;
  reservationId?: string | null;
  error?: string | null;
  createdAt: Date;
}

// Add a log entry to database
export async function addWebhookLog(data: WebhookLogData) {
  try {
    const logEntry = await prisma.webhookLog.create({
      data: {
        eventType: data.eventType,
        status: data.status,
        message: data.message,
        reservationId: data.reservationId || null,
        error: data.error || null,
      }
    });
    
    console.log('📝 Webhook logged to database:', {
      id: logEntry.id,
      eventType: logEntry.eventType,
      status: logEntry.status,
      message: logEntry.message
    });

    // Auto-cleanup old logs (older than 7 days) - run occasionally
    await cleanupOldLogs();

    return logEntry;
  } catch (error) {
    console.error('Failed to log webhook activity to database:', error);
    return null;
  }
}

// Get all logs from database (newest first)
export async function getWebhookLogs(): Promise<WebhookLog[]> {
  try {
    const logs = await prisma.webhookLog.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 1000 // Limit to prevent huge queries
    });

    // Auto-cleanup when logs are accessed
    await cleanupOldLogs();

    return logs;
  } catch (error) {
    console.error('Failed to get webhook logs from database:', error);
    return [];
  }
}

// Clear all logs from database
export async function clearWebhookLogs(): Promise<void> {
  try {
    await prisma.webhookLog.deleteMany();
    console.log('🗑️ All webhook logs cleared from database');
  } catch (error) {
    console.error('Failed to clear webhook logs from database:', error);
  }
}

// Auto-cleanup logs older than 7 days and enforce max count
async function cleanupOldLogs(): Promise<void> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Delete logs older than 7 days
    const deleteOldResult = await prisma.webhookLog.deleteMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo
        }
      }
    });

    // Check total count and delete excess logs if over limit
    const totalCount = await prisma.webhookLog.count();
    const MAX_LOGS = 1000;

    if (totalCount > MAX_LOGS) {
      const excessLogs = await prisma.webhookLog.findMany({
        orderBy: {
          createdAt: 'asc'
        },
        take: totalCount - MAX_LOGS,
        select: {
          id: true
        }
      });

      if (excessLogs.length > 0) {
        const deleteExcessResult = await prisma.webhookLog.deleteMany({
          where: {
            id: {
              in: excessLogs.map(log => log.id)
            }
          }
        });
        
        if (deleteExcessResult.count > 0) {
          console.log(`🧹 Cleaned up ${deleteExcessResult.count} excess webhook logs (over ${MAX_LOGS} limit)`);
        }
      }
    }

    if (deleteOldResult.count > 0) {
      console.log(`🧹 Cleaned up ${deleteOldResult.count} old webhook logs (>7 days)`);
    }
  } catch (error) {
    console.error('Failed to cleanup old webhook logs:', error);
  }
}