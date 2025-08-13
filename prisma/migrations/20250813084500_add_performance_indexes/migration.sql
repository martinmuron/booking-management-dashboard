-- Add indexes for better query performance on large datasets
CREATE INDEX IF NOT EXISTS "idx_bookings_checkin_date" ON "bookings"("checkInDate");
CREATE INDEX IF NOT EXISTS "idx_bookings_checkout_date" ON "bookings"("checkOutDate");
CREATE INDEX IF NOT EXISTS "idx_bookings_status" ON "bookings"("status");
CREATE INDEX IF NOT EXISTS "idx_bookings_created_at" ON "bookings"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_bookings_updated_at" ON "bookings"("updatedAt");

-- Composite index for common date range queries
CREATE INDEX IF NOT EXISTS "idx_bookings_date_status" ON "bookings"("checkInDate", "status");