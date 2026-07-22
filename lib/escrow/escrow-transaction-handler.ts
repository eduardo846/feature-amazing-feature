/**
 * Escrow Transaction Handler
 * Handles concurrent escrow mutations with pessimistic locking and strict ordering
 * Prevents deadlocks through:
 * 1. SERIALIZABLE isolation level
 * 2. Strict row lock ordering (creator → client → escrow → balance)
 * 3. Automatic deadlock retry with exponential backoff
 */

import {
  executeTransaction,
  IsolationLevel,
  TransactionOptions,
  deadlockDetector,
} from "@/lib/db/transaction-manager";
import { acquireLocksInOrder, LockMode } from "@/lib/db/pessimistic-lock";

/**
 * Release escrow funds to payee
 * Acquires locks in strict order to prevent deadlocks
 */
export async function releaseEscrowFunds(
  escrowId: string,
  creatorId: string,
  clientId: string,
): Promise<{ success: boolean; escrow: any; error?: string }> {
  try {
    const result = await executeTransaction(
      async (tx) => {
        // Acquire locks in strict order: creator → client → escrow → balance
        const locks = await acquireLocksInOrder(
          tx,
          [
            { type: "creator", id: creatorId },
            { type: "client", id: clientId },
            { type: "escrow", id: escrowId },
            { type: "balance", id: creatorId },
          ],
          LockMode.EXCLUSIVE,
        );

        // Fetch escrow with lock held
        const escrow = await tx.escrow.findUnique({
          where: { id: escrowId },
        });

        if (!escrow) {
          throw new Error(`Escrow not found: ${escrowId}`);
        }

        if (escrow.status !== "funded_authorized") {
          throw new Error(`Escrow is not funded_authorized: ${escrow.status}`);
        }

        // Update escrow status
        const updatedEscrow = await tx.escrow.update({
          where: { id: escrowId },
          data: {
            status: "released",
            releasedAt: new Date(),
          },
        });

        // Update creator balance
        await tx.balance.upsert({
          where: { userId: creatorId },
          update: {
            available: {
              increment: escrow.amount,
            },
          },
          create: {
            userId: creatorId,
            available: escrow.amount,
            locked: 0,
          },
        });

        // Record transaction
        await tx.transaction.create({
          data: {
            type: "escrow_release",
            userId: creatorId,
            amount: escrow.amount,
            escrowId: escrowId,
            status: "completed",
          },
        });

        return updatedEscrow;
      },
      {
        isolationLevel: IsolationLevel.SERIALIZABLE,
        maxRetries: 3,
        retryDelay: 100,
      },
    );

    return { success: true, escrow: result };
  } catch (error) {
    const err = error as Error;

    // Detect and log deadlocks
    if (err.message.includes("deadlock")) {
      deadlockDetector.recordDeadlock(
        ["creator", "client", "escrow", "balance"],
        err.message,
      );
    }

    return {
      success: false,
      escrow: null,
      error: err.message,
    };
  }
}

/**
 * Refund escrow to payer
 * Acquires locks in strict order to prevent deadlocks
 */
export async function refundEscrow(
  escrowId: string,
  creatorId: string,
  clientId: string,
): Promise<{ success: boolean; escrow: any; error?: string }> {
  try {
    const result = await executeTransaction(
      async (tx) => {
        // Acquire locks in strict order: creator → client → escrow → balance
        const locks = await acquireLocksInOrder(
          tx,
          [
            { type: "creator", id: creatorId },
            { type: "client", id: clientId },
            { type: "escrow", id: escrowId },
            { type: "balance", id: clientId },
          ],
          LockMode.EXCLUSIVE,
        );

        // Fetch escrow with lock held
        const escrow = await tx.escrow.findUnique({
          where: { id: escrowId },
        });

        if (!escrow) {
          throw new Error(`Escrow not found: ${escrowId}`);
        }

        if (escrow.status !== "funded_authorized") {
          throw new Error(`Escrow is not funded_authorized: ${escrow.status}`);
        }

        // Update escrow status
        const updatedEscrow = await tx.escrow.update({
          where: { id: escrowId },
          data: {
            status: "refunded",
            refundedAt: new Date(),
          },
        });

        // Update client balance
        await tx.balance.upsert({
          where: { userId: clientId },
          update: {
            available: {
              increment: escrow.amount,
            },
          },
          create: {
            userId: clientId,
            available: escrow.amount,
            locked: 0,
          },
        });

        // Record transaction
        await tx.transaction.create({
          data: {
            type: "escrow_refund",
            userId: clientId,
            amount: escrow.amount,
            escrowId: escrowId,
            status: "completed",
          },
        });

        return updatedEscrow;
      },
      {
        isolationLevel: IsolationLevel.SERIALIZABLE,
        maxRetries: 3,
        retryDelay: 100,
      },
    );

    return { success: true, escrow: result };
  } catch (error) {
    const err = error as Error;

    // Detect and log deadlocks
    if (err.message.includes("deadlock")) {
      deadlockDetector.recordDeadlock(
        ["creator", "client", "escrow", "balance"],
        err.message,
      );
    }

    return {
      success: false,
      escrow: null,
      error: err.message,
    };
  }
}

/**
 * Dispute escrow
 * Locks funds and prevents release/refund
 */
export async function disputeEscrow(
  escrowId: string,
  creatorId: string,
  clientId: string,
  reason: string,
): Promise<{ success: boolean; escrow: any; error?: string }> {
  try {
    const result = await executeTransaction(
      async (tx) => {
        // Acquire locks in strict order
        const locks = await acquireLocksInOrder(
          tx,
          [
            { type: "creator", id: creatorId },
            { type: "client", id: clientId },
            { type: "escrow", id: escrowId },
          ],
          LockMode.EXCLUSIVE,
        );

        // Fetch escrow with lock held
        const escrow = await tx.escrow.findUnique({
          where: { id: escrowId },
        });

        if (!escrow) {
          throw new Error(`Escrow not found: ${escrowId}`);
        }

        if (escrow.status !== "funded_authorized") {
          throw new Error(`Escrow is not funded_authorized: ${escrow.status}`);
        }

        // Update escrow status
        const updatedEscrow = await tx.escrow.update({
          where: { id: escrowId },
          data: {
            status: "disputed",
            disputeReason: reason,
            disputedAt: new Date(),
          },
        });

        // Record dispute
        await tx.dispute.create({
          data: {
            escrowId: escrowId,
            creatorId: creatorId,
            clientId: clientId,
            reason: reason,
            status: "open",
          },
        });

        return updatedEscrow;
      },
      {
        isolationLevel: IsolationLevel.SERIALIZABLE,
        maxRetries: 3,
        retryDelay: 100,
      },
    );

    return { success: true, escrow: result };
  } catch (error) {
    const err = error as Error;

    if (err.message.includes("deadlock")) {
      deadlockDetector.recordDeadlock(
        ["creator", "client", "escrow"],
        err.message,
      );
    }

    return {
      success: false,
      escrow: null,
      error: err.message,
    };
  }
}

/**
 * Get deadlock statistics
 */
export function getDeadlockStats(): {
  totalDeadlocks: number;
  recentDeadlocks: number;
  deadlockRate: number;
} {
  const allDeadlocks = deadlockDetector.getDeadlocks();
  const recentDeadlocks = allDeadlocks.filter(
    (d) => d.timestamp > new Date(Date.now() - 3600000),
  );

  return {
    totalDeadlocks: allDeadlocks.length,
    recentDeadlocks: recentDeadlocks.length,
    deadlockRate: deadlockDetector.getDeadlockRate(),
  };
}
