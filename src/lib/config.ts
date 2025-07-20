// Application configuration
export const config = {
  // HostAway API configuration (READ-ONLY)
  hostaway: {
    baseUrl: 'https://api.hostaway.com/v1',
    accountId: process.env.HOSTAWAY_ACCOUNT_ID!,
    apiKey: process.env.HOSTAWAY_API_KEY!,
  },
  
  // NUKI API configuration
  nuki: {
    baseUrl: 'https://api.nuki.io/api/v1',
    apiKey: process.env.NUKI_API_KEY!,
  },
  
  // Stripe configuration
  stripe: {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  },
  
  // Email configuration
  email: {
    resendApiKey: process.env.RESEND_API_KEY,
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    fromEmail: 'noreply@bookingdashboard.com',
    fromName: 'Booking Dashboard',
  },
  
  // Application settings
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    name: 'Booking Management Dashboard',
  },
  
  // Tourist tax configuration
  touristTax: {
    amountPerAdultPerDay: 50, // 50 crowns
    currency: 'CZK',
    minimumAge: 18,
  },
  
  // Virtual key types
  virtualKeyTypes: {
    MAIN_ENTRANCE: 'main_entrance',
    LUGGAGE_ROOM: 'luggage_room',
    LAUNDRY_ROOM: 'laundry_room',
    ROOM: 'room',
  } as const,
} as const;

// Validation helpers
export const validateConfig = () => {
  const requiredEnvVars = [
    'DATABASE_URL',
    'HOSTAWAY_API_KEY',
    'HOSTAWAY_ACCOUNT_ID',
    'NUKI_API_KEY',
    'NEXTAUTH_SECRET',
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// API endpoints
export const apiEndpoints = {
  // Internal API routes
  bookings: '/api/bookings',
  guests: '/api/guests',
  payments: '/api/payments',
  virtualKeys: '/api/virtual-keys',
  checkIn: '/api/check-in',
  
  // HostAway API endpoints (READ-ONLY)
  hostaway: {
    bookings: '/bookings',
    booking: (id: string) => `/bookings/${id}`,
  },
  
  // NUKI API endpoints
  nuki: {
    keys: '/keys',
    createKey: '/keys',
    deactivateKey: (id: string) => `/keys/${id}/deactivate`,
  },
} as const;