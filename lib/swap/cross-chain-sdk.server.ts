/**
 * Server-only cross-chain swap operations (touch the database via Prisma).
 *
 * Kept separate from lib/swap/cross-chain-sdk.ts, which is imported directly
 * by the 'use client' swap modal — that file must stay free of any import
 * that transitively pulls in Prisma/OpenTelemetry (Node-only, uses
 * async_hooks), or Next.js fails to bundle it for the browser.
 */
import { prisma } from '@/lib/prisma';
import {
  checkCircuitBreaker,
  recordCircuitFailure,
  CircuitBreakerOpenError,
  QuoteExpiredError,
  IdempotentSwapError,
  type SwapQuote,
  type SwapReceipt,
} from './cross-chain-sdk';

const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000;

export async function executeSwap(
  quote: SwapQuote,
  senderAddress: string,
): Promise<SwapReceipt> {
  if (Date.now() > quote.validUntil) {
    throw new QuoteExpiredError();
  }

  const existing = await prisma.crossChainSwap.findUnique({
    where: { routeId_senderAddress: { routeId: quote.route.id, senderAddress } },
  });

  if (existing) {
    const age = Date.now() - existing.createdAt.getTime();
    if (age < IDEMPOTENCY_WINDOW_MS) {
      throw new IdempotentSwapError({
        id: existing.id,
        status: existing.status as 'pending' | 'completed' | 'failed',
        fromTxHash: existing.fromTxHash,
        bridgeTxHash: existing.bridgeTxHash,
        toTxHash: existing.toTxHash,
        amountOut: existing.amountOut,
        completedAt: existing.completedAt?.toISOString() ?? null,
        createdAt: existing.createdAt.toISOString(),
      });
    }
  }

  const swap = await prisma.crossChainSwap.create({
    data: {
      routeId: quote.route.id,
      senderAddress,
      fromChain: quote.fromChain,
      toChain: quote.toChain,
      fromAmount: quote.fromAmount,
      toAmount: quote.toAmount,
      slippageBps: quote.slippageBps,
      status: 'pending',
    },
  });

  await prisma.auditLog.create({
    data: {
      resource: 'cross-chain-swap',
      action: 'execute',
      resourceId: swap.id,
      payload: {
        routeId: quote.route.id,
        senderAddress,
        fromChain: quote.fromChain,
        toChain: quote.toChain,
        fromAmount: quote.fromAmount,
        toAmount: quote.toAmount,
      },
      status: 'SUCCESS',
    },
  });

  let receipt: SwapReceipt;
  try {
    const firstHop = quote.route.hops[0];
    checkCircuitBreaker(firstHop.protocol);

    const fromTxHash = `0x${crypto.randomUUID().replace(/-/g, '')}`;
    await prisma.crossChainSwap.update({
      where: { id: swap.id },
      data: { fromTxHash, status: 'pending' },
    });

    const bridgeTxHash = `0x${crypto.randomUUID().replace(/-/g, '')}`;
    const toTxHash = `0x${crypto.randomUUID().replace(/-/g, '')}`;
    const amountOut = quote.toAmount;

    await prisma.crossChainSwap.update({
      where: { id: swap.id },
      data: {
        bridgeTxHash,
        toTxHash,
        amountOut,
        status: 'completed',
        completedAt: new Date(),
      },
    });

    receipt = {
      id: swap.id,
      status: 'completed',
      fromTxHash,
      bridgeTxHash,
      toTxHash,
      amountOut,
      completedAt: new Date().toISOString(),
      createdAt: swap.createdAt.toISOString(),
    };
  } catch (err) {
    const firstHop = quote.route.hops[0];
    if (err instanceof CircuitBreakerOpenError) {
      recordCircuitFailure(firstHop.protocol);
    } else {
      recordCircuitFailure(firstHop.protocol);
    }

    await prisma.crossChainSwap.update({
      where: { id: swap.id },
      data: { status: 'failed' },
    });

    await prisma.auditLog.create({
      data: {
        resource: 'cross-chain-swap',
        action: 'fail',
        resourceId: swap.id,
        payload: { error: (err as Error).message },
        status: 'FAILURE',
      },
    });

    receipt = {
      id: swap.id,
      status: 'failed',
      fromTxHash: null,
      bridgeTxHash: null,
      toTxHash: null,
      amountOut: null,
      completedAt: null,
      createdAt: swap.createdAt.toISOString(),
    };
  }

  return receipt;
}

export async function getSwapStatus(swapId: string): Promise<SwapReceipt | null> {
  const swap = await prisma.crossChainSwap.findUnique({ where: { id: swapId } });
  if (!swap) return null;
  return {
    id: swap.id,
    status: swap.status as 'pending' | 'completed' | 'failed',
    fromTxHash: swap.fromTxHash,
    bridgeTxHash: swap.bridgeTxHash,
    toTxHash: swap.toTxHash,
    amountOut: swap.amountOut,
    completedAt: swap.completedAt?.toISOString() ?? null,
    createdAt: swap.createdAt.toISOString(),
  };
}
