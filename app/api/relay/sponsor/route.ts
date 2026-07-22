/**
 * POST /api/relay/sponsor
 *
 * Platform paymaster relay endpoint. Receives a signed XDR transaction,
 * wraps it in a fee-bump transaction funded and signed by the platform fee
 * account (see lib/stellar/fee-bump.ts), and submits it to the
 * Stellar/Soroban network.
 *
 * The user never sees a network-fee prompt — the platform absorbs the cost.
 * Requires a valid Bearer JWT and is rate-limited per user to prevent the
 * relay from being used as an open fee-sponsorship service.
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSecretWithFallback } from '@/backend/services/kms';
import { redisCheckRateLimit } from '@/lib/storage/redis';
import { buildFeeBumpXdr, FeeBumpError } from '@/lib/stellar/fee-bump';

export const runtime = 'nodejs';

const HORIZON_URL =
  process.env.STELLAR_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';
const RELAY_RATE_LIMIT_PER_SECOND = 5;

async function authenticate(req: NextRequest): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const secret = await getSecretWithFallback(['JWT_SECRET', 'NEXTAUTH_SECRET']);
    const decoded = jwt.verify(header.slice(7), secret) as any;
    return decoded.id || decoded.sub || decoded.userId || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const userId = await authenticate(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const remaining = await redisCheckRateLimit(userId, RELAY_RATE_LIMIT_PER_SECOND);
  if (remaining < 0) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const { xdr } = await req.json();
    if (!xdr || typeof xdr !== 'string') {
      return NextResponse.json({ error: 'Missing xdr' }, { status: 400 });
    }

    let bumpedXdr: string;
    try {
      bumpedXdr = await buildFeeBumpXdr(xdr);
    } catch (err) {
      if (err instanceof FeeBumpError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    const horizonRes = await fetch(`${HORIZON_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ tx: bumpedXdr }),
    });

    const horizonBody = await horizonRes.json();

    if (!horizonRes.ok) {
      return NextResponse.json(
        { error: horizonBody.title ?? 'Submission failed', detail: horizonBody },
        { status: horizonRes.status },
      );
    }

    return NextResponse.json({
      hash: horizonBody.hash,
      ledger: horizonBody.ledger,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
