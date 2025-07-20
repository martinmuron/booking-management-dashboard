# Booking Management Dashboard

A comprehensive booking management web application that integrates with HostAway booking software to manage property reservations, guest check-ins, tourist tax collection via Stripe, and virtual key distribution through NUKI.

## Features

- **Admin Dashboard**: Centralized booking management with filtering and status tracking
- **Guest Check-in Portal**: Mobile-optimized check-in experience with Apple-inspired design
- **HostAway Integration**: Read-only access to booking data (no modifications to reservations)
- **Stripe Payment Processing**: Secure tourist tax collection
- **NUKI Virtual Keys**: Automated key generation and distribution
- **Email Notifications**: Automated check-in links and confirmations

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **UI Components**: shadcn/ui with black/white theme
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Payment**: Stripe SDK
- **Email**: Resend or SendGrid

## Project Structure

```
src/
├── app/
│   ├── api/                 # API routes
│   │   ├── bookings/        # Booking management (READ-ONLY HostAway)
│   │   ├── guests/          # Guest information
│   │   ├── payments/        # Stripe payment processing
│   │   ├── virtual-keys/    # NUKI key management
│   │   └── check-in/        # Check-in process
│   ├── globals.css          # Global styles with black/white theme
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── admin/               # Admin dashboard components
│   └── guest/               # Guest check-in components
├── lib/
│   ├── config.ts            # Application configuration
│   └── utils.ts             # Utility functions
├── services/                # External API services
├── hooks/                   # Custom React hooks
└── types/                   # TypeScript type definitions
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/booking_dashboard"

# HostAway API (READ-ONLY)
HOSTAWAY_API_KEY="your-hostaway-api-key"
HOSTAWAY_ACCOUNT_ID="your-account-id"

# NUKI API
NUKI_API_KEY="your-nuki-api-key"

# Stripe
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Email Service
RESEND_API_KEY="re_..."
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Important Notes

### HostAway Integration
- **READ-ONLY ACCESS**: The application only reads booking data from HostAway
- **NO MODIFICATIONS**: No reservations or booking data will be altered in HostAway
- **Data Synchronization**: Booking data is synchronized locally for dashboard functionality

### Tourist Tax Calculation
- 50 CZK per adult guest (18+) per day
- Automatically calculated based on guest ages and stay duration
- Processed securely through Stripe

### Virtual Key Types
- Main entrance key (shared for all bookings)
- Luggage room key (shared for all bookings)
- Laundry room key (shared for all bookings)
- Room-specific key (unique per booking)

## Development Status

✅ **Task 1 Completed**: Project structure and core configuration
- Next.js 14 with TypeScript and Tailwind CSS
- shadcn/ui with black/white theme customization
- Directory structure for components, pages, and API routes
- Environment variables configuration
- Basic API route structure
- Type definitions and configuration files

## Next Steps

Refer to `.kiro/specs/booking-management-dashboard/tasks.md` for the complete implementation plan.