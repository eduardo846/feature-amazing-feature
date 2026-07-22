# Summary of bugs found and fixed

This document summarizes the bug audit performed on the project and the fixes applied. It covers three rounds of findings: the initial code audit, issues discovered while verifying those fixes (typecheck/tests), and issues discovered while running the app live.

---

## 1. Initial audit (8 bugs)

### 🔴 Critical

**1. Double fund transfer in the escrow contract**
`backend/contracts/escrow/src/lib.rs`

`release_funds()` and `refund_escrow()` had a duplicated block of checks and **two** calls to `TokenClient::transfer(...)` with the same arguments — one before mutating state and one after. Every release or refund sent double the actual amount.

**Fix:** a single block of checks → state mutation → a single transfer (correct CEI pattern).

**2. Stripe webhook never responded and never validated its signature**
`app/api/webhooks/stripe/route.ts`

The file only exported a helper function (`processStripeWebhookEvent`), not a `POST` — Next.js never treated it as an API route. There was also no signature verification anywhere.

**Fix:** added `export async function POST` that reads the raw body, verifies `stripe-signature` via `stripe.webhooks.constructEvent` (using the already-existing `getStripe()`/`getStripeWebhookSecret()` in `lib/payments/stripe.ts`), and delegates to the event handler.

**3. Fake ZK proof verification**
`app/api/reviews/verify-proof/route.ts`

It only checked that the `nullifier` hadn't been used yet; it never called `groth16.verify` on the submitted proof. Anyone could submit a fake proof and have it accepted.

**Fix:** loads `public/wasm/vkey.json` server-side and calls real `groth16.verify` before accepting the nullifier.

**4. Secrets with an insecure hardcoded fallback**
9 TypeScript files (`server/messaging-ws.ts`, `server/collab.ts`, `app/api/messages/route.ts`, `app/api/reviews/verify-proof/route.ts`, `app/api/collab/route.ts`, `backend/src/trpc-setup.ts`, `server/signaling.ts`, `app/api/signaling/route.ts`) + 2 Rust services (`backend/services/api/src/auth.rs`, `backend/services/auth/src/main.rs`)

All of them fell back to well-known default values (`'dev-secret-change-me'`, `'stellar-dev-secret'`, `'default_secret_for_development_only'`, etc.) if the env var wasn't configured.

**Fix:** migrated to `backend/services/kms.ts` (`getSecret`/`getSecretWithFallback`), which throws if the secret isn't configured — no insecure fallback. In Rust, added weak-secret validation at startup (`validate_jwt_secret_strength`) in both services, failing the process fast if the secret is weak or missing.

### 🟠 High

**5. Decorative pessimistic lock + incompatible status vocabulary**
`lib/db/transaction-manager.ts`, `lib/db/pessimistic-lock.ts`, `lib/escrow/escrow-transaction-handler.ts`

The `SELECT ... FOR UPDATE` lock ran outside the actual transaction (using the global Prisma client instead of the transaction's client), releasing instantly. The code also checked `status === "active"`, a value the real escrow flow (`escrow-service.ts`) never writes.

**Fix:** the transaction's `tx` client is now threaded through the entire locking flow; the status check was corrected to `"funded_authorized"`.

**6. Open Stellar relay with no auth/rate-limit + fee-bump never implemented**
`app/api/relay/sponsor/route.ts`, `app/api/relay/fallback/route.ts`

Anyone could use the relay without authentication. The "fee-bump" promised in the comments was never implemented.

**Fix:** added JWT authentication + rate limiting (same pattern as `messages/route.ts`), and the real fee-bump signed by the platform account (new `lib/stellar/fee-bump.ts`, using `@stellar/stellar-sdk`).

### 🟡 Medium

**7. Non-shared `PrismaClient`**
`app/api/search/vector/route.ts`

Created its own `PrismaClient` instance instead of the shared singleton (`@/lib/prisma`), risking connection-pool exhaustion.

**Fix:** now uses the shared singleton.

---

## 2. Findings during verification (not in the original audit)

**8. `Escrow` schema out of sync with the code**

Running `tsc` in isolation against `lib/payments/escrow-service.ts` (the real Stripe flow, used by the webhook from bug #2) surfaced 7 "Property does not exist" errors: the `Escrow` model in `prisma/schema.prisma` never had the `bountyId`, `freelancerUserId`, `currency`, `platformFeeCents`, `paymentIntentId`, `receiptUrl`, `failureMessage` columns that module needs. On top of that, a database `CHECK CONSTRAINT` only allowed 4 `status` values (`active`, `released`, `refunded`, `disputed`), rejecting the ones the Stripe flow uses (`pending_funding`, `funded_authorized`, `failed`).

**Fix:** updated `prisma/schema.prisma` + new migration `prisma/migrations/20260722_add_escrow_stripe_fields/migration.sql` that adds the columns and widens the constraint to accept both status vocabularies.

**9. `stripe` package never declared as a dependency**

`lib/payments/stripe.ts` had always imported `"stripe"`, but the package was never in `package.json`. Nobody noticed because, before the bug #2 fix, nothing transitively imported that file.

**Fix:** added `"stripe": "^22.3.2"` to `package.json`.

**10. Self-inflicted regression: `AUTH_SECRET` broke while migrating to KMS**

While migrating `server/collab.ts` and `app/api/collab/route.ts` to the new secrets system (bug #4), the `AUTH_SECRET` override they used (among others, in `collab.test.ts`'s tests) was lost, breaking them with "invalid signature".

**Fix:** added `AUTH_SECRET` as a valid `SecretName` in the KMS, falling back to `NEXTAUTH_SECRET`.

---

## 3. Findings from running the app live

**11. `lib/swap/cross-chain-sdk.ts` mixed server-only code with client-side code**

The file had a module-level `import { prisma } from '@/lib/prisma'`, but also exported pure functions (`getSwapQuote`, `formatRoutePath`, etc.) used by a Client Component (`components/swap/cross-chain-swap-modal.tsx`). Since it's a single ES module, Next.js tried to bundle the entire import tree — including `@opentelemetry/sdk-trace-node`, which uses `async_hooks` (Node-only) — for the browser, and the build failed with `Module not found: Can't resolve 'async_hooks'`.

**Fix:** split the database-touching functions (`executeSwap`, `getSwapStatus`) into a new file, `lib/swap/cross-chain-sdk.server.ts`. The original file is now 100% free of server-only imports.

**12. Hydration mismatch from `toLocaleString()` without a fixed locale**

`components/featured-bounties.tsx:65` — `bounty.budget.toLocaleString()` without an explicit locale uses the process's default locale, which can differ between server and browser (`"3,000"` vs `"3.000"`), causing a React hydration error.

**Fix:** locale pinned to `'en-US'`.

**13. (Pending, not fixed) Benign `<script>` tag warning from `ThemeProvider`**

`app/layout.tsx` — `next-themes` injects a `<script>` tag to avoid a theme flash before hydration; React 19/Next 16 emit a console warning for this. It's a standard pattern for that library and doesn't break functionality. Left pending a decision: investigate further or ignore.

---

## Verification

- **TypeScript** (`tsc --noEmit`): 0 new errors introduced (401 pre-existing, in untouched files, none in the files these fixes touched).
- **ESLint**: 0 new errors (only pre-existing style warnings).
- **Vitest**: went from 17 failing test files to 15 — net zero regressions; in fact, two suites that were already failing before any of this work got fixed along the way (`collab.test.ts`, `signaling.test.ts`). The remaining failures (`escrow-service.test.ts`, `stripe-webhook.test.ts`) are due to a missing `DATABASE_URL` in the dev environment (no Postgres available), not the code changes.
- **Rust**: no `cargo`/`rustc` toolchain was available in the environment where this work was done; changes were reviewed line by line manually. Recommend running `cargo clippy --workspace --all-targets --all-features -- -D warnings` locally before merging.

## New files created

- `lib/stellar/fee-bump.ts` — real fee-bump for the Stellar relay.
- `lib/swap/cross-chain-sdk.server.ts` — server-only cross-chain swap functions.
- `prisma/migrations/20260722_add_escrow_stripe_fields/migration.sql` — Escrow schema migration.
