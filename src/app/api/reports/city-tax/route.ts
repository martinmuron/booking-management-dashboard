import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/database';

function parseDateParam(value: string | null, type: 'start' | 'end'): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  if (type === 'start') {
    date.setHours(0, 0, 0, 0);
  } else {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const fromDate = parseDateParam(fromParam, 'start');
    const toDate = parseDateParam(toParam, 'end');

    const where: Prisma.BookingWhereInput = {};

    if (fromDate || toDate) {
      where.checkInDate = {};
      if (fromDate) {
        where.checkInDate.gte = fromDate;
      }
      if (toDate) {
        where.checkInDate.lte = toDate;
      }
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        guests: {
          select: {
            firstName: true,
            lastName: true,
            isLeadGuest: true,
          },
        },
        payments: {
          select: {
            amount: true,
            currency: true,
            status: true,
          },
        },
      },
      orderBy: {
        checkInDate: 'asc',
      },
    });

    const report = bookings.map((booking) => {
      const leadGuestRecord = booking.guests.find((guest) => guest.isLeadGuest);
      const fallbackGuest = booking.guests[0];

      const leadGuestName =
        leadGuestRecord
          ? `${leadGuestRecord.firstName} ${leadGuestRecord.lastName}`.trim()
          : fallbackGuest
            ? `${fallbackGuest.firstName} ${fallbackGuest.lastName}`.trim()
            : booking.guestLeaderName;

      const paidPayments = booking.payments.filter((payment) => payment.status === 'paid');
      const totalPaid = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const currency = paidPayments[0]?.currency ?? 'CZK';

      return {
        bookingId: booking.id,
        hostAwayId: booking.hostAwayId,
        apartment: booking.propertyName,
        leadGuest: leadGuestName,
        numberOfGuests: booking.numberOfGuests,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        totalPaid,
        currency,
        cityTaxPaid: totalPaid > 0,
      };
    });

    const summary = {
      totalBookings: report.length,
      paidCount: report.filter((item) => item.cityTaxPaid).length,
      unpaidCount: report.filter((item) => !item.cityTaxPaid).length,
    };

    return NextResponse.json({
      success: true,
      data: report,
      summary,
      message: 'City tax report generated successfully',
    });
  } catch (error) {
    console.error('❌ Error generating city tax report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate city tax report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
