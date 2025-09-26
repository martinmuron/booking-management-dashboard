-- Add enum for Nuki retry status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NukiRetryStatus') THEN
        CREATE TYPE "NukiRetryStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
    END IF;
END $$;

-- Create table for retry queue
CREATE TABLE IF NOT EXISTS "nuki_key_retries" (
    "id" TEXT PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "keyType" "VirtualKeyType" NOT NULL,
    "deviceId" TEXT NOT NULL,
    "keypadCode" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 20,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL,
    "status" "NukiRetryStatus" NOT NULL DEFAULT 'PENDING',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "nuki_key_retries_bookingId_fkey"
        FOREIGN KEY ("bookingId") REFERENCES "bookings"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "nuki_key_retries_status_nextAttemptAt_idx"
    ON "nuki_key_retries" ("status", "nextAttemptAt");

CREATE INDEX IF NOT EXISTS "nuki_key_retries_bookingId_keyType_idx"
    ON "nuki_key_retries" ("bookingId", "keyType");
