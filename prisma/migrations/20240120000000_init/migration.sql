-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CHECKED_IN', 'PAYMENT_PENDING', 'PAYMENT_COMPLETED', 'KEYS_DISTRIBUTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "GuestSex" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "VirtualKeyType" AS ENUM ('MAIN_ENTRANCE', 'LUGGAGE_ROOM', 'LAUNDRY_ROOM', 'ROOM');

-- CreateTable
CREATE TABLE "bookings" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
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
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "stripePaymentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CZK',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_keys" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "keyType" "VirtualKeyType" NOT NULL,
    "nukiKeyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMP(3),

    CONSTRAINT "virtual_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_hostAwayId_key" ON "bookings"("hostAwayId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_checkInToken_key" ON "bookings"("checkInToken");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripePaymentId_key" ON "payments"("stripePaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_keys_nukiKeyId_key" ON "virtual_keys"("nukiKeyId");

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_keys" ADD CONSTRAINT "virtual_keys_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;