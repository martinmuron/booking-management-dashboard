import { NextRequest, NextResponse } from 'next/server';
import { ubyPortService } from '@/services/ubyport.service';

const escapeCsv = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;

  if (!bookingId) {
    return NextResponse.json({ success: false, error: 'Booking ID is required' }, { status: 400 });
  }

  const exportResult = await ubyPortService.createExportData(bookingId);

  if (!exportResult.success || !exportResult.data) {
    return NextResponse.json({
      success: false,
      error: exportResult.error || 'Unable to prepare guest export data'
    }, { status: 400 });
  }

  const { data } = exportResult;

  if (!data.guests || data.guests.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'No guest registration data available for this booking'
    }, { status: 404 });
  }

  const metaRows = [
    ['Property', data.propertyName],
    ['Property address', data.address],
    ['Check-in date', data.checkInDate],
    ['Check-out date', data.checkOutDate],
    ['Exported at', data.exportedAt],
    []
  ];

  const header = [
    'First name',
    'Last name',
    'Date of birth (YYYY-MM-DD)',
    'Nationality',
    'Document type',
    'Document number',
    'Visa number',
    'Residence address',
    'Purpose of stay',
    'Arrival date',
    'Departure date'
  ];

  const guestRows = data.guests.map((guest) => [
    guest.firstName,
    guest.lastName,
    guest.dateOfBirth,
    guest.nationality,
    guest.documentType,
    guest.documentNumber,
    guest.visaNumber,
    guest.address,
    guest.purposeOfStay,
    guest.arrivalDate,
    guest.departureDate
  ]);

  const csvLines = [
    ...metaRows.map((row) => row.map(escapeCsv).join(',')),
    header.map(escapeCsv).join(','),
    ...guestRows.map((row) => row.map(escapeCsv).join(','))
  ].join('\n');

  return new NextResponse(csvLines, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ubyport_${bookingId}.csv"`
    }
  });
}
