import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { nukiValidationService } from '@/services/nuki-validation.service';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Validating all universal keypad codes...');

    // Get all bookings with universal keypad codes
    const bookingsWithCodes = await prisma.booking.findMany({
      where: {
        universalKeypadCode: {
          not: null
        }
      },
      select: {
        id: true,
        propertyName: true,
        universalKeypadCode: true,
        checkInDate: true,
        checkOutDate: true
      },
      orderBy: {
        checkInDate: 'desc'
      }
    });

    if (bookingsWithCodes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No bookings with universal keypad codes found',
        validations: [],
        timestamp: new Date().toISOString()
      });
    }

    // Get unique codes to validate
    const uniqueCodes = [...new Set(
      bookingsWithCodes
        .map(booking => booking.universalKeypadCode)
        .filter((code): code is string => !!code)
    )];

    console.log(`📋 Found ${uniqueCodes.length} unique keypad codes to validate`);

    // Validate all codes
    const validationResults = await nukiValidationService.validateMultipleCodes(uniqueCodes);

    // Create detailed analysis
    const analysis = {
      totalBookingsWithCodes: bookingsWithCodes.length,
      uniqueCodesCount: uniqueCodes.length,
      validations: Array.from(validationResults.entries()).map(([code, result]) => ({
        code,
        isValid: result.isValid,
        isActive: result.isActive,
        deviceCount: result.deviceCount,
        lastChecked: result.lastChecked,
        error: result.error,
        details: result.details,
        propertiesUsingCode: bookingsWithCodes
          .filter(booking => booking.universalKeypadCode === code)
          .map(booking => ({
            propertyName: booking.propertyName,
            bookingId: booking.id,
            checkInDate: booking.checkInDate.toISOString().split('T')[0],
            checkOutDate: booking.checkOutDate.toISOString().split('T')[0]
          }))
      })),
      summary: {
        validCodes: Array.from(validationResults.values()).filter(r => r.isValid).length,
        activeCodes: Array.from(validationResults.values()).filter(r => r.isActive).length,
        invalidCodes: Array.from(validationResults.values()).filter(r => !r.isValid).length,
        inactiveCodes: Array.from(validationResults.values()).filter(r => r.isValid && !r.isActive).length,
        errorCodes: Array.from(validationResults.values()).filter(r => !!r.error).length
      },
      cacheStats: nukiValidationService.getCacheStats()
    };

    // Identify problematic codes
    const problematicCodes = analysis.validations.filter(v =>
      !v.isValid || !v.isActive || v.error
    );

    if (problematicCodes.length > 0) {
      console.log(`⚠️ Found ${problematicCodes.length} problematic codes:`,
        problematicCodes.map(c => `${c.code} (${c.propertiesUsingCode[0]?.propertyName})`));
    }

    return NextResponse.json({
      success: true,
      message: `Validated ${uniqueCodes.length} keypad codes`,
      analysis,
      problematicCodes: problematicCodes.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error validating Nuki codes:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate Nuki codes',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, clearCache } = body;

    if (clearCache) {
      nukiValidationService.clearCache();
      return NextResponse.json({
        success: true,
        message: 'Validation cache cleared',
        timestamp: new Date().toISOString()
      });
    }

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: 'Code parameter is required',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    console.log(`🔍 Validating single code: ${code}`);

    const result = await nukiValidationService.validateUniversalKeypadCode(code);

    return NextResponse.json({
      success: true,
      message: `Validated code: ${code}`,
      validation: {
        code,
        ...result
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error validating single Nuki code:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate Nuki code',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}