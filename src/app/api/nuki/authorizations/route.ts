import { NextResponse } from 'next/server';
import { nukiService } from '@/services/nuki.service';

export async function GET() {
  try {
    console.log('🔐 Fetching all Nuki authorizations');

    const [auths, devices] = await Promise.all([
      nukiService.getAllAuthorizations(),
      nukiService.getAllDevices()
    ]);

    // Create device lookup map
    const deviceMap = new Map(devices.map(d => [d.smartlockId, d]));

    // Enhance authorizations with device information
    const authsWithDevices = auths.map(auth => ({
      ...auth,
      devices: auth.smartlockIds.map(id => ({
        id,
        name: deviceMap.get(id)?.name || `Device ${id}`,
        type: deviceMap.get(id)?.deviceTypeName || 'Unknown',
        state: deviceMap.get(id)?.stateName || 'Unknown',
        serverState: deviceMap.get(id)?.serverStateName || 'Unknown'
      })),
      isExpired: auth.allowedUntilDate ? new Date(auth.allowedUntilDate) < new Date() : false,
      isActive: auth.allowedFromDate && auth.allowedUntilDate ? 
        new Date(auth.allowedFromDate) <= new Date() && new Date(auth.allowedUntilDate) >= new Date() :
        auth.enabled,
      hasTimeRestriction: !!(auth.allowedFromDate && auth.allowedUntilDate),
      hasWeekdayRestriction: !!auth.allowedWeekDays && auth.allowedWeekDays !== 127,
      hasTimeOfDayRestriction: !!(auth.allowedFromTime !== undefined && auth.allowedUntilTime !== undefined)
    }));

    // Calculate statistics
    const stats = {
      total: authsWithDevices.length,
      active: authsWithDevices.filter(a => a.isActive).length,
      expired: authsWithDevices.filter(a => a.isExpired).length,
      timeRestricted: authsWithDevices.filter(a => a.hasTimeRestriction).length,
      byType: authsWithDevices.reduce((acc, auth) => {
        const typeName = auth.typeName || 'Unknown';
        acc[typeName] = (acc[typeName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentActivity: authsWithDevices
        .filter(a => a.lastActiveDate)
        .sort((a, b) => new Date(b.lastActiveDate).getTime() - new Date(a.lastActiveDate).getTime())
        .slice(0, 10)
    };

    return NextResponse.json({
      success: true,
      data: {
        authorizations: authsWithDevices,
        stats
      }
    });

  } catch (error) {
    console.error('❌ Error fetching Nuki authorizations:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to fetch Nuki authorizations'
    }, { status: 500 });
  }
}