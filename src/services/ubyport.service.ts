import httpntlm from 'httpntlm';

import { prisma } from '@/lib/database';
import type { Booking as PrismaBooking, Guest as PrismaGuest, UbyPortExport as PrismaUbyPortExport } from '@prisma/client';
import { UbyPortStatus } from '@prisma/client';

// UbyPort SOAP API interfaces based on Czech Police documentation
interface UbyPortSoapGuest {
  cFrom: string; // DateTime - arrival date/time
  cUntil: string; // DateTime - departure date/time
  cSurN: string; // Surname - only letters, apostrophe, hyphen
  cFirstN: string; // First name - only letters, apostrophe, hyphen
  cDate: string; // Date of birth DDMMYYYY or 0000YYYY or 00DDYYYY
  cPlac?: string; // Birthplace - not used, can be null
  cNati: string; // Nationality code (3-letter from číselník)
  cDocN: string; // Document number 4-30 chars, "INPASS" + parent doc for children
  cVisN?: string; // Visa number max 15 chars, optional
  cResi?: string; // Home country residence max 128 chars, optional
  cPurp?: number; // Purpose of stay from číselník, default 99 if not specified
  cSpz?: string; // Vehicle registration - not used, can be null
  cNote?: string; // Note max 255 chars, required if cDocN is "INPASS"
}

interface UbyPortSoapAccommodationList {
  VracetPDF: boolean; // Whether to return PDF documents
  uIdub: string; // Accommodation provider ID
  uMark: string; // Accommodation provider abbreviation
  uName: string; // Accommodation provider name
  uCont: string; // Contact for accommodation provider
  uOkr: string; // District from accommodation address
  uOb: string; // Municipality from accommodation address
  uObCa?: string; // Part of municipality from accommodation address
  uStr?: string; // Street from accommodation address
  uHomN: string; // House number (red, descriptive) max 4 digits + E
  uOriN?: string; // Orientation number (blue) max 3 digits + letter
  uPsc: string; // Postal code 5 digits
  Ubytovani: UbyPortSoapGuest[]; // List of accommodated guests
}

interface UbyPortSoapResponse {
  ChybyHlavicky?: string; // Header errors separated by ;
  DokumentPotvrzeni?: string; // Confirmation document PDF in base64
  DokumentChybyPotvrzeni?: string; // Error confirmation document PDF in base64
  ChybyZaznamu?: string[]; // Record errors separated by ;
  PseudoRazitko?: string; // Stamp contained in PDF document
}

interface UbyPortGuestData {
  firstName: string;
  lastName: string;
  dateOfBirth?: string; // YYYY-MM-DD format
  nationality?: string;
  documentType?: string;
  documentNumber?: string;
  visaNumber?: string;
  arrivalDate: string; // YYYY-MM-DD format
  departureDate: string; // YYYY-MM-DD format
  address: string; // Property address
  purposeOfStay?: string;
}

interface UbyPortExportData {
  bookingId: string;
  propertyName: string;
  address: string;
  checkInDate: string;
  checkOutDate: string;
  guests: UbyPortGuestData[];
  exportedAt: string;
}

type PendingExport = PrismaUbyPortExport & {
  booking: {
    hostAwayId: string;
    propertyName: string;
    guestLeaderName: string;
    checkInDate: Date;
    numberOfGuests: number;
  };
};

class UbyPortService {

  private getApiUrl(): string {
    // Primary UbyPort 2.0 endpoint path
    return 'https://ubyport.policie.cz/ws_uby/ws_uby.svc';
  }

  private getAuthCode(): string {
    // AutenticationCode is reserved but must be filled - documentation recommends "X"
    return process.env.UBYPORT_AUTH_CODE || 'X';
  }

  private getCredentials(): { username: string; password: string } {
    return {
      username: process.env.UBYPORT_USERNAME || '',
      password: process.env.UBYPORT_PASSWORD || ''
    };
  }

  private async sendSoapRequest(soapAction: string, soapEnvelope: string): Promise<{ statusCode: number; body: string }>
  {
    const credentials = this.getCredentials();
    if (!credentials.username || !credentials.password) {
      throw new Error('UbyPort credentials not configured');
    }

    const domain = process.env.UBYPORT_DOMAIN || 'EXRESORTMV';
    const workstation = process.env.UBYPORT_WORKSTATION || '';

    console.log(`🔐 Using credentials: ${credentials.username} with domain: ${domain}`);

    // Try httpntlm first
    try {
      return await new Promise((resolve, reject) => {
        httpntlm.post(
          {
            url: this.getApiUrl(),
            username: credentials.username,
            password: credentials.password,
            domain,
            workstation,
            headers: {
              'Content-Type': 'text/xml; charset=utf-8',
              'SOAPAction': soapAction,
              'User-Agent': 'UbyPort-Client/1.0'
            },
            body: soapEnvelope
          },
          (err: Error | null, res?: { statusCode?: number; body?: string }) => {
            if (err) {
              reject(err);
              return;
            }

            if (!res) {
              reject(new Error('Empty response from UbyPort API'));
              return;
            }

            resolve({
              statusCode: res.statusCode ?? 0,
              body: res.body ?? ''
            });
          }
        );
      });
    } catch (ntlmError) {
      console.log('🔄 NTLM failed, trying basic auth fallback:', ntlmError);

      // Fallback to basic authentication if NTLM fails
      const basicAuth = Buffer.from(`${domain}\\${credentials.username}:${credentials.password}`).toString('base64');

      const response = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': soapAction,
          'Authorization': `Basic ${basicAuth}`,
          'User-Agent': 'UbyPort-Client/1.0'
        },
        body: soapEnvelope
      });

      const responseText = await response.text();

      return {
        statusCode: response.status,
        body: responseText
      };
    }
  }

  private getAccommodationInfo(): UbyPortSoapAccommodationList {
    return {
      VracetPDF: true, // Request PDF confirmation documents
      uIdub: process.env.UBYPORT_ACCOMMODATION_ID || '', // Your accommodation ID
      uMark: process.env.UBYPORT_ACCOMMODATION_MARK || '', // Your accommodation abbreviation  
      uName: process.env.UBYPORT_ACCOMMODATION_NAME || '', // Your accommodation name
      uCont: process.env.UBYPORT_CONTACT_EMAIL || '', // Contact email
      uOkr: process.env.UBYPORT_DISTRICT || '', // District
      uOb: process.env.UBYPORT_MUNICIPALITY || '', // Municipality
      uObCa: process.env.UBYPORT_MUNICIPALITY_PART || undefined, // Part of municipality
      uStr: process.env.UBYPORT_STREET || undefined, // Street
      uHomN: process.env.UBYPORT_HOUSE_NUMBER || '', // House number (red)
      uOriN: process.env.UBYPORT_ORIENTATION_NUMBER || undefined, // Orientation number (blue)
      uPsc: process.env.UBYPORT_POSTAL_CODE || '', // Postal code (5 digits)
      Ubytovani: [] // Will be filled with guests
    };
  }

  /**
   * Format date of birth for UbyPort API (DDMMYYYY, 0000YYYY, or 00DDYYYY)
   */
  private formatDateOfBirth(dateOfBirth?: Date | null): string {
    if (!dateOfBirth) {
      return '00001900'; // Default if no birth date
    }

    const date = new Date(dateOfBirth);
    if (isNaN(date.getTime())) {
      return '00001900'; // Default for invalid dates
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const year = String(date.getFullYear());

    return `${day}${month}${year}`;
  }

  /**
   * Format nationality code for UbyPort (3-letter code from Czech police číselník)
   */
  private formatNationalityCode(nationality?: string | null): string {
    if (!nationality) {
      return 'XXX';
    }

    const trimmed = nationality.trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(trimmed)) {
      return trimmed;
    }

    // Legacy support: map a handful of common names if encountered
    const nationalityMap: Record<string, string> = {
      'CZECH REPUBLIC': 'CZE',
      'SLOVAKIA': 'SVK',
      'GERMANY': 'DEU',
      'AUSTRIA': 'AUT',
      'POLAND': 'POL',
      'HUNGARY': 'HUN',
      'UNITED STATES': 'USA',
      'UNITED KINGDOM': 'GBR',
      'FRANCE': 'FRA',
      'ITALY': 'ITA',
      'SPAIN': 'ESP',
      'NETHERLANDS': 'NLD',
      'BELGIUM': 'BEL',
      'SWITZERLAND': 'CHE',
      'UKRAINE': 'UKR',
      'RUSSIA': 'RUS',
      'CHINA': 'CHN',
      'JAPAN': 'JPN',
      'INDIA': 'IND',
      'CANADA': 'CAN',
      'AUSTRALIA': 'AUS',
      'BRAZIL': 'BRA',
      'MEXICO': 'MEX'
    };

    return nationalityMap[trimmed] || 'XXX';
  }

  /**
   * Submit accommodation data to Czech Police UbyPort system via SOAP API
   */
  private async submitToUbyPortApi(accommodationData: UbyPortSoapAccommodationList): Promise<{
    success: boolean;
    response?: UbyPortSoapResponse;
    error?: string;
    confirmationPdf?: string;
  }> {
    try {
      console.log('📤 Submitting accommodation data to Czech Police UbyPort API...');

      const credentials = this.getCredentials();
      if (!credentials.username || !credentials.password) {
        return {
          success: false,
          error: 'UbyPort credentials not configured. Please set UBYPORT_USERNAME and UBYPORT_PASSWORD environment variables.'
        };
      }

      // Create SOAP envelope for ZapisUbytovane method
      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:uby="http://UBY.pcr.cz/WS_UBY">
  <soap:Header />
  <soap:Body>
    <uby:ZapisUbytovane>
      <uby:AutentificationCode>${this.getAuthCode()}</uby:AutentificationCode>
      <uby:Seznam>
        <VracetPDF>${accommodationData.VracetPDF}</VracetPDF>
        <uIdub>${accommodationData.uIdub}</uIdub>
        <uMark>${accommodationData.uMark}</uMark>
        <uName>${accommodationData.uName}</uName>
        <uCont>${accommodationData.uCont}</uCont>
        <uOkr>${accommodationData.uOkr}</uOkr>
        <uOb>${accommodationData.uOb}</uOb>
        ${accommodationData.uObCa ? `<uObCa>${accommodationData.uObCa}</uObCa>` : '<uObCa />'}
        ${accommodationData.uStr ? `<uStr>${accommodationData.uStr}</uStr>` : '<uStr />'}
        <uHomN>${accommodationData.uHomN}</uHomN>
        ${accommodationData.uOriN ? `<uOriN>${accommodationData.uOriN}</uOriN>` : '<uOriN />'}
        <uPsc>${accommodationData.uPsc}</uPsc>
        <Ubytovani>
          ${accommodationData.Ubytovani.map(guest => `
            <Ubytovany>
              <cFrom>${guest.cFrom}</cFrom>
              <cUntil>${guest.cUntil}</cUntil>
              <cSurN>${guest.cSurN}</cSurN>
              <cFirstN>${guest.cFirstN}</cFirstN>
              <cDate>${guest.cDate}</cDate>
              <cPlac />
              <cNati>${guest.cNati}</cNati>
              <cDocN>${guest.cDocN}</cDocN>
              ${guest.cVisN ? `<cVisN>${guest.cVisN}</cVisN>` : '<cVisN />'}
              ${guest.cResi ? `<cResi>${guest.cResi}</cResi>` : '<cResi />'}
              ${guest.cPurp ? `<cPurp>${guest.cPurp}</cPurp>` : '<cPurp />'}
              <cSpz />
              ${guest.cNote ? `<cNote>${guest.cNote}</cNote>` : '<cNote />'}
            </Ubytovany>
          `).join('')}
        </Ubytovani>
      </uby:Seznam>
    </uby:ZapisUbytovane>
  </soap:Body>
</soap:Envelope>`;

      const ntlmResponse = await this.sendSoapRequest(
        'http://UBY.pcr.cz/WS_UBY/IWS_UBY/ZapisUbytovane',
        soapEnvelope
      );

      if (ntlmResponse.statusCode !== 200) {
        return {
          success: false,
          error: `HTTP error ${ntlmResponse.statusCode}`
        };
      }

      const responseText = ntlmResponse.body;
      console.log('📨 UbyPort API response received');

      // Parse SOAP response (simplified parsing - in production you might want to use a proper XML parser)
      const hasErrors = responseText.includes('<ChybyHlavicky>') || responseText.includes('<ChybyZaznamu>');
      
      // Extract confirmation PDF if present
      const pdfMatch = responseText.match(/<DokumentPotvrzeni>([\s\S]*?)<\/DokumentPotvrzeni>/);
      const confirmationPdf = pdfMatch ? pdfMatch[1] : undefined;

      if (hasErrors) {
        console.log('⚠️  UbyPort API returned with errors, but data was processed');
      } else {
        console.log('✅ UbyPort API submission successful');
      }

      return {
        success: true,
        response: {
          // Parse actual response data if needed
          DokumentPotvrzeni: confirmationPdf
        },
        confirmationPdf
      };

    } catch (error) {
      console.error('❌ Error submitting to UbyPort API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test UbyPort API connection
   */
  async testConnection(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      console.log('🧪 Testing UbyPort API connection...');

      const credentials = this.getCredentials();
      if (!credentials.username || !credentials.password) {
        return {
          success: false,
          error: 'UbyPort credentials not configured'
        };
      }

      // Create SOAP envelope for TestDostupnosti method
      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:uby="http://UBY.pcr.cz/WS_UBY">
  <soap:Header />
  <soap:Body>
    <uby:TestDostupnosti>
      <uby:AutentificationCode>${this.getAuthCode()}</uby:AutentificationCode>
    </uby:TestDostupnosti>
  </soap:Body>
</soap:Envelope>`;

      const ntlmResponse = await this.sendSoapRequest(
        'http://UBY.pcr.cz/WS_UBY/IWS_UBY/TestDostupnosti',
        soapEnvelope
      );

      if (ntlmResponse.statusCode !== 200) {
        return {
          success: false,
          error: `HTTP error ${ntlmResponse.statusCode}`
        };
      }

      const responseText = ntlmResponse.body;
      const isSuccess = responseText.includes('<TestDostupnostiResult>true</TestDostupnostiResult>');

      return {
        success: isSuccess,
        message: isSuccess ? 'UbyPort API connection successful' : 'UbyPort API returned false'
      };

    } catch (error) {
      console.error('❌ UbyPort API connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Convert guest data to UbyPort SOAP format
   */
  private formatGuestForUbyPortSoap(guest: PrismaGuest, booking: PrismaBooking): UbyPortSoapGuest {
    // Format check-in and check-out times (UbyPort expects DateTime format)
    const checkInDateTime = new Date(booking.checkInDate).toISOString();
    const checkOutDateTime = new Date(booking.checkOutDate).toISOString();

    const residenceComponents = [guest.residenceAddress, guest.residenceCity, guest.residenceCountry]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);

    const purposeCode = guest.purposeOfStay ? Number.parseInt(guest.purposeOfStay, 10) : NaN;

    return {
      cFrom: checkInDateTime,
      cUntil: checkOutDateTime,
      cSurN: guest.lastName || 'Unknown',
      cFirstN: guest.firstName || 'Unknown', 
      cDate: this.formatDateOfBirth(guest.dateOfBirth),
      cNati: this.formatNationalityCode(guest.nationality || guest.citizenship),
      cDocN: guest.documentNumber ? String(guest.documentNumber).toUpperCase() : 'UNKNOWN',
      cVisN: guest.visaNumber ? String(guest.visaNumber).toUpperCase() : undefined,
      cResi: residenceComponents.length ? residenceComponents.join(', ') : undefined,
      cPurp: Number.isNaN(purposeCode) ? 99 : purposeCode,
      cNote: guest.notes || undefined
    };
  }

  /**
   * Format guest data for UbyPort Czech police export (internal data structure)
   */
  private formatGuestForUbyPort(guest: PrismaGuest, booking: PrismaBooking): UbyPortGuestData {
    const residenceComponents = [guest.residenceAddress, guest.residenceCity, guest.residenceCountry]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);

    return {
      firstName: guest.firstName || 'Unknown',
      lastName: guest.lastName || 'Unknown',
      dateOfBirth: guest.dateOfBirth ? new Date(guest.dateOfBirth).toISOString().split('T')[0] : undefined,
      nationality: guest.nationality || guest.citizenship || undefined,
      documentType: guest.documentType || undefined,
      documentNumber: guest.documentNumber ? String(guest.documentNumber).toUpperCase() : undefined,
      visaNumber: guest.visaNumber ? String(guest.visaNumber).toUpperCase() : undefined,
      arrivalDate: new Date(booking.checkInDate).toISOString().split('T')[0],
      departureDate: new Date(booking.checkOutDate).toISOString().split('T')[0],
      address: residenceComponents.length ? residenceComponents.join(', ') : booking.propertyName,
      purposeOfStay: guest.purposeOfStay || '99'
    };
  }

  /**
   * Create UbyPort export data for a booking
   */
  async createExportData(bookingId: string): Promise<{
    success: boolean;
    data?: UbyPortExportData;
    error?: string;
  }> {
    try {
      console.log(`📊 Creating UbyPort export data for booking ${bookingId}...`);

      // Get booking with guests
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          guests: true,
          ubyPortExport: true
        }
      });

      if (!booking) {
        return {
          success: false,
          error: `Booking ${bookingId} not found`
        };
      }

      // Check if export already exists
      if (booking.ubyPortExport) {
        console.log(`📋 UbyPort export already exists for booking ${bookingId} (status: ${booking.ubyPortExport.status})`);
        return {
          success: true,
          data: JSON.parse(booking.ubyPortExport.exportData)
        };
      }

      // Format guest data for UbyPort
      const formattedGuests = booking.guests.map(guest => 
        this.formatGuestForUbyPort(guest, booking)
      );

      // Create export data structure
      const exportData: UbyPortExportData = {
        bookingId: booking.id,
        propertyName: booking.propertyName,
        address: booking.propertyName, // TODO: Get actual property address from HostAway
        checkInDate: new Date(booking.checkInDate).toISOString().split('T')[0],
        checkOutDate: new Date(booking.checkOutDate).toISOString().split('T')[0],
        guests: formattedGuests,
        exportedAt: new Date().toISOString()
      };

      console.log(`✅ Created UbyPort export data for booking ${bookingId} with ${formattedGuests.length} guests`);

      return {
        success: true,
        data: exportData
      };

    } catch (error) {
      console.error(`❌ Error creating UbyPort export data for booking ${bookingId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Save export data to database
   */
  async saveExportData(bookingId: string, exportData: UbyPortExportData, status: UbyPortStatus = 'EXPORTED'): Promise<{
    success: boolean;
    exportId?: string;
    error?: string;
  }> {
    try {
      console.log(`💾 Saving UbyPort export data for booking ${bookingId}...`);

      // Get the booking's check-in date for export date
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { checkInDate: true }
      });

      if (!booking) {
        return {
          success: false,
          error: `Booking ${bookingId} not found`
        };
      }

      // Create or update the export record
      const ubyPortExport = await prisma.ubyPortExport.upsert({
        where: { bookingId },
        update: {
          status,
          exportData: JSON.stringify(exportData),
          updatedAt: new Date(),
          ...(status === 'SUBMITTED' && { submittedAt: new Date() })
        },
        create: {
          bookingId,
          exportDate: booking.checkInDate,
          status,
          exportData: JSON.stringify(exportData),
          ...(status === 'SUBMITTED' && { submittedAt: new Date() })
        }
      });

      console.log(`✅ Saved UbyPort export data with ID ${ubyPortExport.id} (status: ${status})`);

      return {
        success: true,
        exportId: ubyPortExport.id
      };

    } catch (error) {
      console.error(`❌ Error saving UbyPort export data for booking ${bookingId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate and submit UbyPort export for a booking on check-in night 
   * This is called by the cron job on the actual check-in date
   */
  async generateExportOnCheckIn(bookingId: string): Promise<{
    success: boolean;
    exportId?: string;
    message?: string;
    error?: string;
    confirmationPdf?: string;
  }> {
    try {
      console.log(`🌙 Generating and submitting UbyPort export for booking ${bookingId} on check-in night...`);

      // Get booking with guests
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          guests: true,
          ubyPortExport: true
        }
      });

      if (!booking) {
        return {
          success: false,
          error: `Booking ${bookingId} not found`
        };
      }

      // Check if export already exists and was successful
      if (booking.ubyPortExport && booking.ubyPortExport.status === 'SUBMITTED') {
        console.log(`📋 UbyPort export already submitted for booking ${bookingId}`);
        return {
          success: true,
          exportId: booking.ubyPortExport.id,
          message: 'UbyPort export already submitted'
        };
      }

      // Check if we have UbyPort credentials configured
      const credentials = this.getCredentials();
      if (!credentials.username || !credentials.password) {
        console.log(`⚠️  UbyPort credentials not configured, skipping submission`);
        
        // Don't create export data if credentials aren't configured
        // This prevents old data from being submitted when credentials are added later
        return {
          success: true,
          message: `UbyPort credentials not configured - export skipped for booking ${bookingId}`
        };
      }

      // Prepare SOAP data for submission
      const accommodationInfo = this.getAccommodationInfo();
      accommodationInfo.Ubytovani = booking.guests.map(guest => 
        this.formatGuestForUbyPortSoap(guest, booking)
      );

      // Submit to Czech Police UbyPort API
      const submitResult = await this.submitToUbyPortApi(accommodationInfo);

      if (!submitResult.success) {
        // Save failed export with error
        const exportData = await this.createExportData(bookingId);
        if (exportData.success && exportData.data) {
          await this.saveExportData(bookingId, exportData.data, 'FAILED');
        }

        return {
          success: false,
          error: `Failed to submit to UbyPort API: ${submitResult.error}`
        };
      }

      // Create export data for database storage
      const exportResult = await this.createExportData(bookingId);
      if (!exportResult.success || !exportResult.data) {
        return {
          success: false,
          error: exportResult.error || 'Failed to create export data after submission'
        };
      }

      // Save successful export
      const saveResult = await this.saveExportData(bookingId, exportResult.data, 'SUBMITTED');

      if (!saveResult.success) {
        console.error(`⚠️  Data submitted to Czech Police but failed to save to database: ${saveResult.error}`);
      }

      console.log(`✅ UbyPort export submitted to Czech Police for booking ${bookingId}`);

      return {
        success: true,
        exportId: saveResult.exportId,
        message: `UbyPort export submitted to Czech Police for ${exportResult.data.guests.length} guests`,
        confirmationPdf: submitResult.confirmationPdf
      };

    } catch (error) {
      console.error(`❌ Error generating UbyPort export for booking ${bookingId}:`, error);
      
      // Try to save failed export
      try {
        const exportData = await this.createExportData(bookingId);
        if (exportData.success && exportData.data) {
          await this.saveExportData(bookingId, exportData.data, 'FAILED');
        }
      } catch (saveError) {
        console.error('Failed to save failed export:', saveError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get pending exports that need to be submitted to Czech police
   */
  async getPendingExports(): Promise<{
    success: boolean;
    exports?: PendingExport[];
    error?: string;
  }> {
    try {
      console.log('📋 Getting pending UbyPort exports...');

      const pendingExports: PendingExport[] = await prisma.ubyPortExport.findMany({
        where: {
          status: 'EXPORTED' // Ready to submit
        },
        include: {
          booking: {
            select: {
              hostAwayId: true,
              propertyName: true,
              guestLeaderName: true,
              checkInDate: true,
              numberOfGuests: true
            }
          }
        },
        orderBy: {
          exportDate: 'asc'
        }
      });

      console.log(`📊 Found ${pendingExports.length} pending UbyPort exports`);

      return {
        success: true,
        exports: pendingExports
      };

    } catch (error) {
      console.error('❌ Error getting pending UbyPort exports:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Mark an export as submitted to Czech police
   */
  async markAsSubmitted(exportId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      console.log(`✅ Marking UbyPort export ${exportId} as submitted...`);

      await prisma.ubyPortExport.update({
        where: { id: exportId },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log(`✅ UbyPort export ${exportId} marked as submitted`);

      return {
        success: true,
        message: 'Export marked as submitted to Czech police'
      };

    } catch (error) {
      console.error(`❌ Error marking export ${exportId} as submitted:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get export statistics
   */
  async getExportStats(): Promise<{
    success: boolean;
    stats?: {
      pending: number;
      exported: number;
      submitted: number;
      failed: number;
      total: number;
    };
    error?: string;
  }> {
    try {
      const stats = await prisma.ubyPortExport.groupBy({
        by: ['status'],
        _count: true
      });

      const formattedStats = {
        pending: 0,
        exported: 0,
        submitted: 0,
        failed: 0,
        total: 0
      };

      stats.forEach(stat => {
        formattedStats[stat.status.toLowerCase() as keyof typeof formattedStats] = stat._count;
        formattedStats.total += stat._count;
      });

      return {
        success: true,
        stats: formattedStats
      };

    } catch (error) {
      console.error('❌ Error getting UbyPort export stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

}

export const ubyPortService = new UbyPortService();
