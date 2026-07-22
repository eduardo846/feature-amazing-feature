import type Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import {
  findEscrowByPaymentIntent,
  markFundedAuthorized,
} from "@/lib/payments/escrow-service";
import { getStripe, getStripeWebhookSecret } from "@/lib/payments/stripe";

export const runtime = "nodejs";

/**
 * Process a Stripe webhook event and update escrow state accordingly.
 *
 * On `payment_intent.amount_capturable_updated` we transition the
 * linked escrow to `funded_authorized` so the release flow can proceed.
 */
export async function processStripeWebhookEvent(
  event: Stripe.Event,
): Promise<void> {
  if (event.type !== "payment_intent.amount_capturable_updated") {
    return;
  }

  const pi = event.data.object as Stripe.PaymentIntent;

  // Prefer explicit escrowId in metadata
  const escrowId = pi.metadata?.escrowId as string | undefined;
  if (escrowId) {
    await markFundedAuthorized(escrowId);
    return;
  }

  // Fallback: resolve escrow by payment intent ID
  const escrow = await findEscrowByPaymentIntent(pi.id);
  if (escrow) {
    await markFundedAuthorized(escrow.id);
  }
}

/**
 * POST /api/webhooks/stripe — verifies the request actually came from Stripe
 * (via the `stripe-signature` header and the webhook signing secret) before
 * processing the event. Must read the raw body: signature verification hashes
 * the exact bytes Stripe sent, so any JSON re-serialization would break it.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = await getStripe();
    const webhookSecret = await getStripeWebhookSecret();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await processStripeWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe-webhook] event processing failed:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
