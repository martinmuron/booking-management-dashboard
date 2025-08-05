import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function POST() {
  try {
    // Check if we can connect to the database
    await prisma.$connect();
    
    // Create enums using simple approach
    try {
      await prisma.$executeRawUnsafe(`CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CHECKED_IN', 'PAYMENT_PENDING', 'PAYMENT_COMPLETED', 'KEYS_DISTRIBUTED', 'COMPLETED')`);
    } catch {
      // Type already exists, ignore
    }
    
    try {
      await prisma.$executeRawUnsafe(`CREATE TYPE "GuestSex" AS ENUM ('MALE', 'FEMALE', 'OTHER')`);
    } catch {
      // Type already exists, ignore
    }
    
    try {
      await prisma.$executeRawUnsafe(`CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED')`);
    } catch {
      // Type already exists, ignore
    }
    
    try {
      await prisma.$executeRawUnsafe(`CREATE TYPE "VirtualKeyType" AS ENUM ('MAIN_ENTRANCE', 'LUGGAGE_ROOM', 'LAUNDRY_ROOM', 'ROOM')`);
    } catch {
      // Type already exists, ignore
    }

    // Create tables if they don't exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "bookings" (
        "id" TEXT NOT NULL,
        "hostAwayId" TEXT NOT NULL,
        "propertyName" TEXT NOT NULL,
        "guestLeaderName" TEXT NOT NULL,
        "guestLeaderEmail" TEXT NOT NULL,
        "guestLeaderPhone" TEXT,
        "checkInDate" TIMESTAMP(3) NOT NULL,
        "checkOutDate" TIMESTAMP(3) NOT NULL,
        "numberOfGuests" INTEGER NOT NULL,
        "roomNumber" TEXT,
        "checkInToken" TEXT NOT NULL,
        "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "guests" (
        "id" TEXT NOT NULL,
        "bookingId" TEXT NOT NULL,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT NOT NULL,
        "birthDate" TIMESTAMP(3) NOT NULL,
        "nationality" TEXT NOT NULL,
        "sex" "GuestSex" NOT NULL,
        "residenceCountry" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "phone" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" TEXT NOT NULL,
        "bookingId" TEXT NOT NULL,
        "stripePaymentId" TEXT NOT NULL,
        "amount" INTEGER NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'CZK',
        "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
        "paidAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "virtual_keys" (
        "id" TEXT NOT NULL,
        "bookingId" TEXT NOT NULL,
        "keyType" "VirtualKeyType" NOT NULL,
        "nukiKeyId" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deactivatedAt" TIMESTAMP(3),
        CONSTRAINT "virtual_keys_pkey" PRIMARY KEY ("id")
      )
    `);

    // Create indexes if they don't exist
    try {
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "bookings_hostAwayId_key" ON "bookings"("hostAwayId")`);
    } catch {
      // Index already exists, ignore
    }
    
    try {
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "bookings_checkInToken_key" ON "bookings"("checkInToken")`);
    } catch {
      // Index already exists, ignore
    }
    
    try {
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "payments_stripePaymentId_key" ON "payments"("stripePaymentId")`);
    } catch {
      // Index already exists, ignore
    }
    
    try {
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "virtual_keys_nukiKeyId_key" ON "virtual_keys"("nukiKeyId")`);
    } catch {
      // Index already exists, ignore
    }

    // Add foreign keys if they don't exist
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "guests" ADD CONSTRAINT "guests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    } catch {
      // Constraint already exists, ignore
    }
    
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    } catch {
      // Constraint already exists, ignore
    }
    
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "virtual_keys" ADD CONSTRAINT "virtual_keys_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    } catch {
      // Constraint already exists, ignore
    }

    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Migration failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}