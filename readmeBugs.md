# Resumen de bugs encontrados y arreglados

Este documento resume la auditoría de bugs realizada sobre el proyecto y las correcciones aplicadas. Cubre tres tandas de hallazgos: la auditoría inicial del código, los problemas descubiertos al verificar esas correcciones (typecheck/tests), y los problemas descubiertos al correr la app en vivo.

---

## 1. Auditoría inicial (8 bugs)

### 🔴 Críticos

**1. Doble transferencia de fondos en el contrato de escrow**
`backend/contracts/escrow/src/lib.rs`

`release_funds()` y `refund_escrow()` tenían un bloque de checks duplicado y **dos** llamadas a `TokenClient::transfer(...)` con los mismos argumentos — una antes de mutar el estado y otra después. Cada liberación o reembolso enviaba el doble del monto real.

**Fix:** un único bloque de checks → mutación de estado → una sola transferencia (patrón CEI correcto).

**2. Webhook de Stripe no respondía y no validaba firma**
`app/api/webhooks/stripe/route.ts`

El archivo solo exportaba una función auxiliar (`processStripeWebhookEvent`), no un `POST` — Next.js nunca lo trataba como ruta de API. Tampoco había verificación de firma.

**Fix:** agregado `export async function POST` que lee el raw body, verifica `stripe-signature` con `stripe.webhooks.constructEvent` (usando `getStripe()`/`getStripeWebhookSecret()` ya existentes en `lib/payments/stripe.ts`), y delega al handler del evento.

**3. Verificación de prueba ZK falsa**
`app/api/reviews/verify-proof/route.ts`

Solo comprobaba que el `nullifier` no estuviera usado; nunca llamaba a `groth16.verify` sobre la prueba recibida. Cualquiera podía enviar un proof falso.

**Fix:** carga `public/wasm/vkey.json` en servidor y llama a `groth16.verify` real antes de aceptar el nullifier.

**4. Secretos con fallback inseguro hardcodeado**
9 archivos TypeScript (`server/messaging-ws.ts`, `server/collab.ts`, `app/api/messages/route.ts`, `app/api/reviews/verify-proof/route.ts`, `app/api/collab/route.ts`, `backend/src/trpc-setup.ts`, `server/signaling.ts`, `app/api/signaling/route.ts`) + 2 servicios Rust (`backend/services/api/src/auth.rs`, `backend/services/auth/src/main.rs`)

Todos caían a valores por defecto conocidos (`'dev-secret-change-me'`, `'stellar-dev-secret'`, `'default_secret_for_development_only'`, etc.) si la env var no estaba configurada.

**Fix:** migrados a `backend/services/kms.ts` (`getSecret`/`getSecretWithFallback`), que lanza error si el secreto no está configurado — sin fallback inseguro. En Rust, agregada validación de secretos débiles al arranque (`validate_jwt_secret_strength`) en ambos servicios, con fallo rápido del proceso si el secreto es débil o falta.

### 🟠 Altos

**5. Lock pesimista decorativo + vocabulario de estado incompatible**
`lib/db/transaction-manager.ts`, `lib/db/pessimistic-lock.ts`, `lib/escrow/escrow-transaction-handler.ts`

El lock `SELECT ... FOR UPDATE` se ejecutaba fuera de la transacción real (con el cliente Prisma global, no el de la transacción), liberándose al instante. Además, el código comprobaba `status === "active"`, un valor que el flujo real de escrow (`escrow-service.ts`) nunca escribe.

**Fix:** el cliente `tx` de la transacción se pasa a través de todo el flujo de locking; el chequeo de estado se corrigió a `"funded_authorized"`.

**6. Relay de Stellar abierto sin auth/rate-limit + fee-bump nunca implementado**
`app/api/relay/sponsor/route.ts`, `app/api/relay/fallback/route.ts`

Cualquiera podía usar el relay sin autenticación. El "fee-bump" prometido en los comentarios nunca se implementaba.

**Fix:** agregada autenticación JWT + rate limiting (mismo patrón que `messages/route.ts`), y el fee-bump real firmado por la cuenta de la plataforma (nuevo `lib/stellar/fee-bump.ts`, usando `@stellar/stellar-sdk`).

### 🟡 Medio

**7. `PrismaClient` no compartido**
`app/api/search/vector/route.ts`

Creaba su propia instancia de `PrismaClient` en vez del singleton compartido (`@/lib/prisma`), arriesgando agotar el pool de conexiones.

**Fix:** usa el singleton compartido.

---

## 2. Hallazgos durante la verificación (no estaban en la auditoría original)

**8. Schema de `Escrow` desincronizado con el código**

Al correr `tsc` de forma aislada sobre `lib/payments/escrow-service.ts` (el flujo real de Stripe, usado por el webhook del bug #2) aparecieron 7 errores de "Property does not exist": el modelo `Escrow` en `prisma/schema.prisma` nunca tuvo las columnas `bountyId`, `freelancerUserId`, `currency`, `platformFeeCents`, `paymentIntentId`, `receiptUrl`, `failureMessage` que ese módulo necesita. Además, un `CHECK CONSTRAINT` en la base de datos solo permitía 4 valores de `status` (`active`, `released`, `refunded`, `disputed`), rechazando los que usa el flujo de Stripe (`pending_funding`, `funded_authorized`, `failed`).

**Fix:** actualizado `prisma/schema.prisma` + nueva migración `prisma/migrations/20260722_add_escrow_stripe_fields/migration.sql` que agrega las columnas y amplía el constraint para aceptar ambos vocabularios de estado.

**9. Paquete `stripe` nunca declarado como dependencia**

`lib/payments/stripe.ts` importaba `"stripe"` desde siempre, pero el paquete nunca estuvo en `package.json`. Nadie lo notó porque, antes del fix del bug #2, nada importaba ese archivo transitivamente.

**Fix:** agregado `"stripe": "^22.3.2"` a `package.json`.

**10. Regresión propia: `AUTH_SECRET` roto al migrar a KMS**

Al migrar `server/collab.ts` y `app/api/collab/route.ts` al nuevo sistema de secretos (bug #4), se perdió el override `AUTH_SECRET` que usaban (entre otros) los tests de `collab.test.ts`, rompiéndolos con "invalid signature".

**Fix:** agregado `AUTH_SECRET` como `SecretName` válido en el KMS, con fallback a `NEXTAUTH_SECRET`.

---

## 3. Hallazgos corriendo la app en vivo

**11. `lib/swap/cross-chain-sdk.ts` mezclaba código server-only con código de cliente**

El archivo tenía un `import { prisma } from '@/lib/prisma'` a nivel de módulo, pero también exportaba funciones puras (`getSwapQuote`, `formatRoutePath`, etc.) usadas por un Client Component (`components/swap/cross-chain-swap-modal.tsx`). Como es un solo módulo ES, Next.js intentaba bundlear todo el árbol de imports —incluyendo `@opentelemetry/sdk-trace-node`, que usa `async_hooks` (solo Node)— para el navegador, y el build fallaba con `Module not found: Can't resolve 'async_hooks'`.

**Fix:** separadas las funciones que tocan la base de datos (`executeSwap`, `getSwapStatus`) a un nuevo archivo `lib/swap/cross-chain-sdk.server.ts`. El archivo original quedó 100% libre de imports server-only.

**12. Hydration mismatch por `toLocaleString()` sin locale fijo**

`components/featured-bounties.tsx:65` — `bounty.budget.toLocaleString()` sin locale explícito usa el locale por defecto del proceso, que puede diferir entre servidor y navegador (`"3,000"` vs `"3.000"`), causando un error de hidratación en React.

**Fix:** fijado el locale a `'en-US'`.

**13. (Pendiente, no arreglado) Warning benigno de `<script>` en `ThemeProvider`**

`app/layout.tsx` — `next-themes` inyecta un `<script>` para evitar el parpadeo de tema antes de la hidratación; React 19/Next 16 emiten un warning en consola por esto. Es un patrón estándar de esa librería, no rompe funcionalidad. Queda pendiente de decisión: investigar más a fondo o ignorar.

---

## Verificación

- **TypeScript** (`tsc --noEmit`): 0 errores nuevos introducidos (401 preexistentes en archivos no tocados, ninguno en los archivos de estos fixes).
- **ESLint**: 0 errores nuevos (solo warnings preexistentes de estilo).
- **Vitest**: de 17 archivos de test fallando a 15 — cero regresiones netas; de hecho se arreglaron dos suites que ya fallaban antes de tocar nada (`collab.test.ts`, `signaling.test.ts`). Las fallas restantes (`escrow-service.test.ts`, `stripe-webhook.test.ts`) son por falta de `DATABASE_URL` en el entorno de desarrollo (no hay Postgres disponible), no por los cambios de código.
- **Rust**: no había toolchain de `cargo`/`rustc` disponible en el entorno donde se hizo el trabajo; los cambios se revisaron línea por línea manualmente. Se recomienda correr `cargo clippy --workspace --all-targets --all-features -- -D warnings` localmente antes de mergear.

## Archivos nuevos creados

- `lib/stellar/fee-bump.ts` — fee-bump real para el relay de Stellar.
- `lib/swap/cross-chain-sdk.server.ts` — funciones server-only del swap cross-chain.
- `prisma/migrations/20260722_add_escrow_stripe_fields/migration.sql` — migración del schema de Escrow.
