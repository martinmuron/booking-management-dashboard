interface HostAwayAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface HostAwayReservation {
  id: number;
  listingMapId: number;  // This is the correct field name per API docs
  listingName: string;   // Property name is included directly in reservation!
  channelId: number;
  channelName: string;
  reservationId: string;
  guestName: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string | null;    // Available in API - can be null for some bookings
  phone: string | null;         // Available in API - can be null for some bookings  
  numberOfGuests: number;
  adults: number;
  children?: number;
  infants?: number;
  arrivalDate: string;
  departureDate: string;
  nights: number;
  totalPrice: number;
  currency: string;
  status: string;
  confirmationCode: string;
  // Optional fields that might be useful
  guestAddress?: string;
  guestCity?: string;
  guestCountry?: string;
  guestZipCode?: string;
  doorCode?: string;
  checkInTime?: number;
  checkOutTime?: number;
}

interface HostAwayReservationsResponse {
  status: string;
  result: HostAwayReservation[];
  count: number;
  limit: number;
  offset: number;
}

interface HostAwayListing {
  id: number;
  name: string;
  address: string;
  description?: string;
  personCapacity?: number;
  bedroomsNumber?: number;
  bathroomsNumber?: number;
  price?: number;
  currencyCode?: string;
  thumbnailUrl?: string;
  listingImages?: Array<{
    id: number;
    url: string;
    caption: string;
  }>;
  listingAmenities?: Array<{
    id: number;
    amenityName: string;
  }>;
  airbnbListingUrl?: string;
  vrboListingUrl?: string;
  expediaListingUrl?: string;
}

interface HostAwayListingsResponse {
  status: string;
  result: HostAwayListing[];
}

interface HostAwayCustomField {
  id?: number;
  customFieldId?: number;
  name?: string;
  fieldName?: string;
  identifier?: string;
  value?: string;
  customFieldName?: string;
}

interface HostAwayCustomFieldsResponse {
  status: string;
  result: HostAwayCustomField[];
}

let accessToken: string | null = null;
let tokenExpiry: number = 0;

class HostAwayService {
  private readonly baseUrl = 'https://api.hostaway.com/v1';
  private readonly apiKey = process.env.HOSTAWAY_API_KEY;
  private readonly accountId = process.env.HOSTAWAY_ACCOUNT_ID;

  constructor() {
    if (!this.apiKey || !this.accountId) {
      throw new Error('HostAway API credentials are not configured');
    }
  }

  private async getAccessToken(): Promise<string> {
    if (accessToken && Date.now() < tokenExpiry) {
      return accessToken;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      console.log('🔐 Attempting HostAway authentication with:', {
        accountId: this.accountId?.substring(0, 6) + '...',
        apiKeyLength: this.apiKey?.length,
        hasAccountId: !!this.accountId,
        hasApiKey: !!this.apiKey
      });

      const response = await fetch('https://api.hostaway.com/v1/accessTokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-control': 'no-cache',
        },
        body: `grant_type=client_credentials&client_id=${this.accountId}&client_secret=${this.apiKey}&scope=general`,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('🔐 Auth response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HostAway auth failed:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText
        });
        throw new Error(`HostAway auth failed: ${response.status} ${response.statusText}`);
      }

      const data: HostAwayAuthResponse = await response.json();
      accessToken = data.access_token;
      tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 minute before expiry

      return accessToken;
    } catch (error) {
      console.error('Failed to get HostAway access token:', error);
      throw error;
    }
  }

  private async makeRequest<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const token = await this.getAccessToken();
    
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    console.log('🌐 Making HostAway API request:', url.toString());

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-control': 'no-cache',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HostAway API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch from HostAway endpoint ${endpoint}:`, error);
      throw error;
    }
  }

  private async makeUpdateRequest<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
    const token = await this.getAccessToken();
    
    const url = `${this.baseUrl}${endpoint}`;

    console.log('🌐 Making HostAway API PUT request:', url);
    console.log('📦 Request data:', JSON.stringify(data, null, 2));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-control': 'no-cache',
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HostAway PUT request failed:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText
        });
        throw new Error(`HostAway API PUT request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to PUT to HostAway endpoint ${endpoint}:`, error);
      throw error;
    }
  }

  async getListings(): Promise<HostAwayListing[]> {
    try {
      const response = await this.makeRequest<HostAwayListingsResponse>('/listings', {
        includeResources: '1'
      });
      return response.result || [];
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      return [];
    }
  }

  async getReservations(params?: {
    limit?: number;
    offset?: number;
    checkInDateFrom?: string;
    checkInDateTo?: string;
    status?: string;
  }): Promise<{
    data: HostAwayReservation[];
    totalCount: number;
    currentOffset: number;
    currentLimit: number;
  } | HostAwayReservation[]> {
    try {
      // Map our internal params to HostAway API query params
      const queryParams: Record<string, string> = {
        includeResources: '1',
        limit: params?.limit?.toString() || '200',
        offset: params?.offset?.toString() || '0'
      };

      // Only add date filters if explicitly provided
      if (params?.checkInDateFrom) {
        queryParams.arrivalStartDate = params.checkInDateFrom;
      }
      if (params?.checkInDateTo) {
        queryParams.arrivalEndDate = params.checkInDateTo;
      }

      // Note: status is not a documented filter for reservations; avoid adding unsupported params

      console.log('🔍 HostAway API request params:', queryParams);

      const response = await this.makeRequest<HostAwayReservationsResponse>('/reservations', queryParams);
      
      console.log('📊 HostAway API response:', {
        status: response.status,
        totalCount: response.count, // Total records available
        returnedCount: response.result?.length || 0,
        limit: response.limit,
        offset: response.offset
      });
      
      // Return both the data and metadata for pagination
      return {
        data: response.result || [],
        totalCount: response.count,
        currentOffset: response.offset,
        currentLimit: response.limit
      };
    } catch (error) {
      console.error('❌ Failed to fetch reservations:', error);
      return {
        data: [],
        totalCount: 0,
        currentOffset: 0,
        currentLimit: 0
      };
    }
  }

  async getReservationById(id: number): Promise<HostAwayReservation | null> {
    try {
      const response = await this.makeRequest<{result: HostAwayReservation}>(`/reservations/${id}`, {
        includeResources: '1'
      });
      return response.result || null;
    } catch (error) {
      console.error(`Failed to fetch reservation ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all available custom fields to find the Nick Jenny check-in link field ID
   */
  async getCustomFields(): Promise<{ success: boolean; fields?: HostAwayCustomField[]; nickJennyFieldId?: number; error?: string }> {
    try {
      console.log('🔍 Fetching HostAway custom fields to find Nick Jenny check-in link field...');
      
      // First try the standard custom fields endpoint
      try {
        const response = await this.makeRequest<HostAwayCustomFieldsResponse>('/customFields');
        if (response && response.result) {
          const nickJennyField = response.result.find((field: HostAwayCustomField) => 
            field.name === 'reservation_check_in_link_nick_jenny' || 
            field.fieldName === 'reservation_check_in_link_nick_jenny' ||
            field.identifier === 'reservation_check_in_link_nick_jenny'
          );
          
          console.log('✅ Retrieved custom fields, Nick Jenny field:', nickJennyField);
          return { 
            success: true, 
            fields: response.result,
            nickJennyFieldId: nickJennyField?.id || nickJennyField?.customFieldId
          };
        }
      } catch {
        console.log('⚠️ /customFields endpoint failed, trying reservation sample...');
      }

      // Fallback: Get a sample reservation with includeResources to see customFieldValues format
      const sampleResponse = await this.makeRequest<{result: (HostAwayReservation & {customFieldValues?: HostAwayCustomField[]})[]}>('/reservations', {
        includeResources: '1',
        limit: '1'
      });
      
      if (sampleResponse?.result?.[0]?.customFieldValues) {
        console.log('✅ Sample reservation customFieldValues:', sampleResponse.result[0].customFieldValues);
        return { 
          success: true, 
          fields: sampleResponse.result[0].customFieldValues 
        };
      }
      
      return { success: false, error: 'No custom fields found' };
    } catch (error) {
      console.error('❌ Failed to fetch custom fields:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Update ONLY the Nick Jenny check-in link field for NEW reservations
   * This preserves all other existing custom fields
   */
  async updateNickJennyCheckInLink(
    reservationId: number, 
    checkInLink: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔗 Updating Nick Jenny check-in link for NEW reservation ${reservationId}`);

      // Get existing reservation to preserve other custom fields
      const existingReservation = await this.getReservationById(reservationId);
      if (!existingReservation) {
        return { success: false, error: 'Reservation not found' };
      }

      // Get current custom field values to preserve them
      const currentCustomFields = ((existingReservation as HostAwayReservation & {customFieldValues?: HostAwayCustomField[]}).customFieldValues) || [];
      console.log('📋 Current custom fields:', currentCustomFields);

      // Find Nick Jenny field ID if it exists
      let nickJennyFieldId: number | null = null;
      const existingNickJennyField = currentCustomFields.find((field: HostAwayCustomField) => 
        field.customFieldId && (
          // Try to identify by checking if it contains a check-in link
          field.value?.includes('/checkin/') ||
          // Or by any other identifier you might have
          field.customFieldName?.includes('nick_jenny') ||
          field.name?.includes('nick_jenny')
        )
      );

      if (existingNickJennyField && existingNickJennyField.customFieldId) {
        nickJennyFieldId = existingNickJennyField.customFieldId;
        console.log(`🎯 Found existing Nick Jenny field ID: ${nickJennyFieldId}`);
      } else {
        // Try to get field ID from custom fields endpoint
        const customFieldsResult = await this.getCustomFields();
        if (customFieldsResult.nickJennyFieldId) {
          nickJennyFieldId = customFieldsResult.nickJennyFieldId;
          console.log(`🎯 Found Nick Jenny field ID from API: ${nickJennyFieldId}`);
        }
      }

      if (!nickJennyFieldId) {
        console.log('⚠️ Nick Jenny custom field ID not found, skipping HostAway update');
        return { success: true, error: 'Nick Jenny custom field not configured in HostAway' };
      }

      // Prepare updated custom fields - preserve existing ones, update only Nick Jenny
      const updatedCustomFields = currentCustomFields.filter((field: HostAwayCustomField) => 
        field.customFieldId !== nickJennyFieldId
      );
      
      // Add the Nick Jenny field with new value
      updatedCustomFields.push({
        customFieldId: nickJennyFieldId,
        value: checkInLink
      });

      console.log(`🔄 Updating only Nick Jenny field (ID: ${nickJennyFieldId}) with check-in link`);
      
      const response = await this.makeUpdateRequest(`/reservations/${reservationId}`, {
        customFieldValues: updatedCustomFields
      }) as { status: string; result?: string };

      if (response.status === 'success') {
        console.log(`✅ Successfully updated Nick Jenny check-in link for reservation ${reservationId}`);
        return { success: true };
      } else {
        console.error(`❌ HostAway API error:`, response);
        return { success: false, error: response.result || 'HostAway API error' };
      }
      
    } catch (error) {
      console.error(`❌ Failed to update Nick Jenny check-in link:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Transform HostAway data to our dashboard format
  transformReservationForDashboard(reservation: HostAwayReservation, listings: HostAwayListing[]) {
    const listing = listings.find(l => l.id === reservation.listingMapId);
    
    return {
      id: reservation.id.toString(),
      propertyName: reservation.listingName || listing?.name || `Property ${reservation.listingMapId}`,
      guestLeaderName: `${reservation.guestFirstName} ${reservation.guestLastName}`.trim(),
      guestLeaderEmail: reservation.guestEmail,
      guestLeaderPhone: reservation.phone,
      checkInDate: reservation.arrivalDate,
      numberOfGuests: reservation.numberOfGuests || reservation.adults || 1,
      // Note: We're not using HostAway's status as requested - booking status will be managed by your platform
      hostawaStatus: reservation.status, // Keep this for reference
      rawData: reservation // Keep raw data for debugging
    };
  }
}

export const hostAwayService = new HostAwayService();
export type { HostAwayReservation, HostAwayListing };