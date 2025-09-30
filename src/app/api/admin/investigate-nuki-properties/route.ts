import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { NUKI_AUTHORIZED_PROPERTIES, hasNukiAccess } from '@/utils/nuki-properties';
import { nukiService } from '@/services/nuki.service';

export async function GET() {
  try {
    console.log('🔍 Investigating Nuki property matching issues...');

    // Get all unique property names from bookings
    const uniqueProperties = await prisma.booking.findMany({
      select: {
        propertyName: true,
        universalKeypadCode: true
      },
      distinct: ['propertyName'],
      orderBy: {
        propertyName: 'asc'
      }
    });

    // Get all unique property names that have universal keypad codes
    const propertiesWithCodes = await prisma.booking.findMany({
      where: {
        universalKeypadCode: {
          not: null
        }
      },
      select: {
        propertyName: true,
        universalKeypadCode: true
      },
      distinct: ['propertyName'],
      orderBy: {
        propertyName: 'asc'
      }
    });

    // Get properties with virtual keys
    const propertiesWithVirtualKeys = await prisma.booking.findMany({
      where: {
        virtualKeys: {
          some: {}
        }
      },
      select: {
        propertyName: true,
        virtualKeys: {
          select: {
            keyType: true,
            nukiKeyId: true,
            isActive: true
          }
        }
      },
      distinct: ['propertyName'],
      orderBy: {
        propertyName: 'asc'
      }
    });

    // Analyze property matching
    const analysis = {
      totalUniqueProperties: uniqueProperties.length,
      authorizedProperties: NUKI_AUTHORIZED_PROPERTIES.length,
      propertiesWithCodes: propertiesWithCodes.length,
      propertiesWithVirtualKeys: propertiesWithVirtualKeys.length,

      propertyMatching: uniqueProperties.map(property => ({
        propertyName: property.propertyName,
        hasUniversalCode: !!property.universalKeypadCode,
        isAuthorized: hasNukiAccess(property.propertyName),
        exactMatch: (NUKI_AUTHORIZED_PROPERTIES as readonly string[]).includes(property.propertyName),
        potentialMatches: NUKI_AUTHORIZED_PROPERTIES.filter(authorized =>
          authorized.toLowerCase().includes(property.propertyName.toLowerCase()) ||
          property.propertyName.toLowerCase().includes(authorized.toLowerCase())
        )
      })),

      mismatchedProperties: uniqueProperties.filter(property =>
        property.universalKeypadCode && !hasNukiAccess(property.propertyName)
      ).map(property => ({
        propertyName: property.propertyName,
        universalKeypadCode: property.universalKeypadCode,
        suggestedMatches: NUKI_AUTHORIZED_PROPERTIES.filter(authorized =>
          authorized.toLowerCase().includes(property.propertyName.toLowerCase()) ||
          property.propertyName.toLowerCase().includes(authorized.toLowerCase())
        )
      })),

      authorizedButNotFound: (NUKI_AUTHORIZED_PROPERTIES as readonly string[]).filter(authorized =>
        !uniqueProperties.some(property => property.propertyName === authorized)
      ),

      propertiesWithCodesAnalysis: propertiesWithCodes.map(property => ({
        propertyName: property.propertyName,
        universalKeypadCode: property.universalKeypadCode,
        isAuthorized: hasNukiAccess(property.propertyName)
      })),

      virtualKeysAnalysis: propertiesWithVirtualKeys.map(property => ({
        propertyName: property.propertyName,
        virtualKeyCount: property.virtualKeys.length,
        keyTypes: property.virtualKeys.map(key => key.keyType),
        isAuthorized: hasNukiAccess(property.propertyName)
      }))
    };

    // Check for Ž603 specifically
    const z603Analysis = {
      z603InAuthorizedList: (NUKI_AUTHORIZED_PROPERTIES as readonly string[]).includes('Ž603'),
      z603InDatabase: uniqueProperties.some(p => p.propertyName === 'Ž603'),
      z603WithCodes: propertiesWithCodes.some(p => p.propertyName === 'Ž603'),
      z603WithVirtualKeys: propertiesWithVirtualKeys.some(p => p.propertyName === 'Ž603'),
      relatedZProperties: uniqueProperties.filter(p =>
        p.propertyName.startsWith('Ž6') || p.propertyName.includes('603')
      )
    };

    // Try to get Nuki devices (if API is available)
    let nukiDevicesInfo = null;
    try {
      const nukiDevices = await nukiService.getAllDevices();
      nukiDevicesInfo = {
        totalDevices: nukiDevices.length,
        deviceNames: nukiDevices.map(device => device.name),
        devicesWithZ603: nukiDevices.filter(device =>
          device.name.includes('603') || device.name.includes('Ž603')
        )
      };
    } catch (nukiError) {
      nukiDevicesInfo = {
        error: 'Could not fetch Nuki devices',
        details: nukiError instanceof Error ? nukiError.message : 'Unknown error'
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Property analysis completed',
      analysis,
      z603Analysis,
      nukiDevicesInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error investigating Nuki properties:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to investigate Nuki properties',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
