import { hostAwayService } from './hostaway.service';

class WebhookService {
  private readonly baseUrl = 'https://api.hostaway.com/v1';
  
  /**
   * Create a unified webhook in HostAway
   */
  async createHostAwayWebhook(webhookUrl: string, options?: {
    login?: string;
    password?: string;
    alertEmail?: string;
  }): Promise<{ success: boolean; webhookId?: number; error?: string }> {
    try {
      console.log('🔗 Creating HostAway unified webhook:', webhookUrl);
      
      const response = await fetch(`${this.baseUrl}/webhooks/unifiedWebhooks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await this.getAccessToken()}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          isEnabled: 1,
          url: webhookUrl,
          ...(options?.login && { login: options.login }),
          ...(options?.password && { password: options.password }),
          ...(options?.alertEmail && { alertingEmailAddress: options.alertEmail })
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Webhook created successfully:', data);
      
      return {
        success: data.status === 'success',
        webhookId: data.result?.id,
        error: data.status === 'fail' ? data.result : undefined
      };
      
    } catch (error) {
      console.error('❌ Failed to create webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * List existing unified webhooks
   */
  async listHostAwayWebhooks(): Promise<{ success: boolean; webhooks?: Array<{id: number; url: string; isEnabled: boolean}>; error?: string }> {
    try {
      console.log('📋 Listing HostAway unified webhooks');
      
      const response = await fetch(`${this.baseUrl}/webhooks/unifiedWebhooks`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAccessToken()}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        success: data.status === 'success',
        webhooks: data.result || [],
        error: data.status === 'fail' ? data.result : undefined
      };
      
    } catch (error) {
      console.error('❌ Failed to list webhooks:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Update an existing webhook
   */
  async updateHostAwayWebhook(webhookId: number, updates: {
    isEnabled?: boolean;
    url?: string;
    login?: string;
    password?: string;
    alertEmail?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔧 Updating HostAway webhook ${webhookId}`);
      
      const response = await fetch(`${this.baseUrl}/webhooks/unifiedWebhooks/${webhookId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${await this.getAccessToken()}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          ...(updates.isEnabled !== undefined && { isEnabled: updates.isEnabled ? 1 : 0 }),
          ...(updates.url && { url: updates.url }),
          ...(updates.login && { login: updates.login }),
          ...(updates.password && { password: updates.password }),
          ...(updates.alertEmail && { alertingEmailAddress: updates.alertEmail })
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Webhook updated successfully');
      
      return {
        success: data.status === 'success',
        error: data.status === 'fail' ? data.result : undefined
      };
      
    } catch (error) {
      console.error('❌ Failed to update webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Delete a webhook
   */
  async deleteHostAwayWebhook(webhookId: number): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🗑️  Deleting HostAway webhook ${webhookId}`);
      
      const response = await fetch(`${this.baseUrl}/webhooks/unifiedWebhooks/${webhookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await this.getAccessToken()}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Webhook deleted successfully');
      
      return {
        success: data.status === 'success',
        error: data.status === 'fail' ? data.result : undefined
      };
      
    } catch (error) {
      console.error('❌ Failed to delete webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Get HostAway access token (reuse from hostaway service)
   */
  private async getAccessToken(): Promise<string> {
    // Access the private method from hostAwayService
    return (hostAwayService as unknown as {getAccessToken(): Promise<string>}).getAccessToken();
  }
}

export const webhookService = new WebhookService();