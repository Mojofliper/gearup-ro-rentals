-- Add payment_intent_id column to bookings table
ALTER TABLE "public"."bookings" 
ADD COLUMN "payment_intent_id" "text";

-- Add index for performance
CREATE INDEX "idx_bookings_payment_intent_id" ON "public"."bookings" USING "btree" ("payment_intent_id"); 