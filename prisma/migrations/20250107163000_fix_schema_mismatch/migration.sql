-- Step 1: Rename birthDate to dateOfBirth
ALTER TABLE "guests" RENAME COLUMN "birthDate" TO "dateOfBirth";

-- Step 2: Make dateOfBirth optional
ALTER TABLE "guests" ALTER COLUMN "dateOfBirth" DROP NOT NULL;

-- Step 3: Make other fields optional
ALTER TABLE "guests" ALTER COLUMN "nationality" DROP NOT NULL;
ALTER TABLE "guests" ALTER COLUMN "email" DROP NOT NULL;

-- Step 4: Drop columns that don't exist in the application
ALTER TABLE "guests" DROP COLUMN IF EXISTS "sex";
ALTER TABLE "guests" DROP COLUMN IF EXISTS "residenceCountry";

-- Step 5: Add missing isLeadGuest column
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "isLeadGuest" BOOLEAN DEFAULT false;

-- Step 6: Fix payment table - rename column
ALTER TABLE "payments" RENAME COLUMN "stripePaymentId" TO "stripePaymentIntentId";

-- Step 7: Make stripePaymentIntentId optional
ALTER TABLE "payments" ALTER COLUMN "stripePaymentIntentId" DROP NOT NULL;

-- Step 8: Change currency default
ALTER TABLE "payments" ALTER COLUMN "currency" SET DEFAULT 'eur';

-- Step 9: Convert status column from enum to string
ALTER TABLE "payments" 
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE VARCHAR(50) USING status::text,
  ALTER COLUMN "status" SET DEFAULT 'pending';

-- Step 10: Drop unused enum types
DROP TYPE IF EXISTS "PaymentStatus" CASCADE;
DROP TYPE IF EXISTS "GuestSex" CASCADE;

-- Step 11: Add missing enum values to BookingStatus
DO $$ 
BEGIN
    -- Check and add CONFIRMED if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'CONFIRMED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BookingStatus')
    ) THEN
        ALTER TYPE "BookingStatus" ADD VALUE 'CONFIRMED' AFTER 'PENDING';
    END IF;
    
    -- Check and add CANCELLED if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'CANCELLED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BookingStatus')
    ) THEN
        ALTER TYPE "BookingStatus" ADD VALUE 'CANCELLED';
    END IF;
END$$;