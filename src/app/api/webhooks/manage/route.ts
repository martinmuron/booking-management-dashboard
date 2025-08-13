import { NextRequest, NextResponse } from 'next/server';
import { webhookService } from '@/services/webhook.service';

// GET - List existing webhooks
export async function GET() {
  console.log('📋 Listing HostAway webhooks');
  
  try {
    const result = await webhookService.listHostAwayWebhooks();
    
    return NextResponse.json({
      success: result.success,
      webhooks: result.webhooks || [],
      error: result.error
    });
    
  } catch (error) {
    console.error('❌ Error listing webhooks:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Create new webhook
export async function POST(request: NextRequest) {
  console.log('➕ Creating HostAway webhook');
  
  try {
    const { webhookUrl, login, password, alertEmail } = await request.json();
    
    if (!webhookUrl) {
      return NextResponse.json({
        success: false,
        error: 'webhookUrl is required'
      }, { status: 400 });
    }
    
    const result = await webhookService.createHostAwayWebhook(webhookUrl, {
      login,
      password,
      alertEmail
    });
    
    return NextResponse.json({
      success: result.success,
      webhookId: result.webhookId,
      error: result.error
    });
    
  } catch (error) {
    console.error('❌ Error creating webhook:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT - Update existing webhook
export async function PUT(request: NextRequest) {
  console.log('🔧 Updating HostAway webhook');
  
  try {
    const { webhookId, isEnabled, url, login, password, alertEmail } = await request.json();
    
    if (!webhookId) {
      return NextResponse.json({
        success: false,
        error: 'webhookId is required'
      }, { status: 400 });
    }
    
    const result = await webhookService.updateHostAwayWebhook(webhookId, {
      isEnabled,
      url,
      login,
      password,
      alertEmail
    });
    
    return NextResponse.json({
      success: result.success,
      error: result.error
    });
    
  } catch (error) {
    console.error('❌ Error updating webhook:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Delete webhook
export async function DELETE(request: NextRequest) {
  console.log('🗑️  Deleting HostAway webhook');
  
  try {
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('id');
    
    if (!webhookId) {
      return NextResponse.json({
        success: false,
        error: 'webhook id is required'
      }, { status: 400 });
    }
    
    const result = await webhookService.deleteHostAwayWebhook(parseInt(webhookId));
    
    return NextResponse.json({
      success: result.success,
      error: result.error
    });
    
  } catch (error) {
    console.error('❌ Error deleting webhook:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}