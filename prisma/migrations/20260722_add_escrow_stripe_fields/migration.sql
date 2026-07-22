-- lib/payments/escrow-service.ts (the Stripe PaymentIntent escrow flow) reads
-- and writes these columns, but they were never migrated — the module could
-- not compile or run against the real schema. Add them here.
ALTER TABLE "Escrow" ADD COLUMN IF NOT EXISTS "bountyId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Escrow" ADD COLUMN IF NOT EXISTS "freelancerUserId" TEXT;
ALTER TABLE "Escrow" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'usd';
ALTER TABLE "Escrow" ADD COLUMN IF NOT EXISTS "platformFeeCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Escrow" ADD COLUMN IF NOT EXISTS "paymentIntentId" TEXT;
ALTER TABLE "Escrow" ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT;
ALTER TABLE "Escrow" ADD COLUMN IF NOT EXISTS "failureMessage" TEXT;

CREATE INDEX IF NOT EXISTS "idx_escrow_bounty_id" ON "Escrow"("bountyId");
CREATE INDEX IF NOT EXISTS "idx_escrow_payment_intent_id" ON "Escrow"("paymentIntentId");

-- The Stripe flow uses a different status vocabulary ('pending_funding',
-- 'funded_authorized', 'failed') than the original escrow-transaction-handler
-- flow ('active', 'disputed'). Widen the check constraint added in
-- 20260530_add_escrow_deadlock_prevention to allow both, rather than pick one
-- and break the other.
ALTER TABLE "Escrow" DROP CONSTRAINT IF EXISTS "valid_escrow_status";
ALTER TABLE "Escrow" ADD CONSTRAINT "valid_escrow_status"
  CHECK ("status" IN ('active', 'pending_funding', 'funded_authorized', 'released', 'refunded', 'disputed', 'failed'));
