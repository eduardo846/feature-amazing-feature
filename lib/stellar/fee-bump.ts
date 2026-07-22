/**
 * Platform-sponsored fee-bump for relayed Stellar transactions.
 *
 * The relay endpoints (`/api/relay/sponsor`, `/api/relay/fallback`) accept a
 * signed inner transaction from the client and wrap it in a fee-bump
 * transaction funded and signed by the platform's fee account, so the user
 * never needs XLM to pay network fees.
 */
import {
  Keypair,
  Networks,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { getSecret } from '@/backend/services/kms';

const NETWORK_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE ?? Networks.TESTNET;
const FEE_BUMP_MAX_FEE = process.env.STELLAR_FEE_BUMP_MAX_FEE ?? '1000000';

export class FeeBumpError extends Error {}

let feeSourceKeypairPromise: Promise<Keypair> | null = null;

async function getFeeSourceKeypair(): Promise<Keypair> {
  if (!feeSourceKeypairPromise) {
    feeSourceKeypairPromise = getSecret('STELLAR_FEE_ACCOUNT_SECRET').then((secret) =>
      Keypair.fromSecret(secret),
    );
  }
  return feeSourceKeypairPromise;
}

/**
 * Wrap a signed, unsubmitted inner transaction XDR in a fee-bump transaction
 * funded by the platform's fee account, and sign it.
 *
 * Throws `FeeBumpError` if the XDR does not parse, is already a fee-bump
 * transaction, or its source account is the platform fee account itself
 * (invalid per the Stellar protocol — an account cannot fee-bump its own tx).
 */
export async function buildFeeBumpXdr(innerXdr: string): Promise<string> {
  let innerTx: Transaction;
  try {
    const parsed = TransactionBuilder.fromXDR(innerXdr, NETWORK_PASSPHRASE);
    if (!(parsed instanceof Transaction)) {
      throw new FeeBumpError('Inner transaction must not already be a fee-bump transaction');
    }
    innerTx = parsed;
  } catch (err) {
    if (err instanceof FeeBumpError) throw err;
    throw new FeeBumpError(`Invalid transaction XDR: ${(err as Error).message}`);
  }

  const feeSourceKeypair = await getFeeSourceKeypair();

  if (innerTx.source === feeSourceKeypair.publicKey()) {
    throw new FeeBumpError('Inner transaction source cannot be the platform fee account');
  }

  const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
    feeSourceKeypair,
    FEE_BUMP_MAX_FEE,
    innerTx,
    NETWORK_PASSPHRASE,
  );

  feeBumpTx.sign(feeSourceKeypair);

  return feeBumpTx.toXDR();
}
