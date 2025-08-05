interface HostAwayAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface HostAwayReservation {
  id: number;
  checkInDate: string;
  checkOutDate: string;
  guestFirstName: string;
  guestLastName: string;
  personCapacity: number;
  status: string;
  listingId: number;
  channelId: number;
  listing?: {
    name: string;
    address: string;
  };
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
}

interface HostAwayListingsResponse {
  status: string;
  result: HostAwayListing[];
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

  async getListings(): Promise<HostAwayListing[]> {
    try {
      const response = await this.makeRequest<HostAwayListingsResponse>('/listings');
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
  }): Promise<HostAwayReservation[]> {
    try {
      // Default to get reservations from 30 days ago to 90 days ahead
      const defaultFromDate = new Date();
      defaultFromDate.setDate(defaultFromDate.getDate() - 30);
      const defaultToDate = new Date();
      defaultToDate.setDate(defaultToDate.getDate() + 90);

      const queryParams: Record<string, string> = {
        includeResources: '1', // Include related data like listing info
        limit: params?.limit?.toString() || '50',
        offset: params?.offset?.toString() || '0',
        checkInDateFrom: params?.checkInDateFrom || defaultFromDate.toISOString().split('T')[0],
        checkInDateTo: params?.checkInDateTo || defaultToDate.toISOString().split('T')[0]
      };

      if (params?.status) {
        queryParams.status = params.status;
      }

      console.log('🔍 HostAway API request params:', queryParams);

      const response = await this.makeRequest<HostAwayReservationsResponse>('/reservations', queryParams);
      
      console.log('📊 HostAway API response:', {
        status: response.status,
        count: response.count,
        resultLength: response.result?.length || 0,
        limit: response.limit,
        offset: response.offset
      });
      
      return response.result || [];
    } catch (error) {
      console.error('❌ Failed to fetch reservations:', error);
      return [];
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

  // Transform HostAway data to our dashboard format
  transformReservationForDashboard(reservation: HostAwayReservation, listings: HostAwayListing[]) {
    const listing = listings.find(l => l.id === reservation.listingId);
    
    return {
      id: reservation.id.toString(),
      propertyName: listing?.name || `Property ${reservation.listingId}`,
      guestLeaderName: `${reservation.guestFirstName} ${reservation.guestLastName}`.trim(),
      checkInDate: reservation.checkInDate,
      numberOfGuests: reservation.personCapacity || 1,
      // Note: We're not using HostAway's status as requested - booking status will be managed by your platform
      hostawaStatus: reservation.status, // Keep this for reference
      rawData: reservation // Keep raw data for debugging
    };
  }
}

export const hostAwayService = new HostAwayService();
export type { HostAwayReservation, HostAwayListing };