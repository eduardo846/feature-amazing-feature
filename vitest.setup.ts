import '@testing-library/jest-dom';

// Secrets read via backend/services/kms.ts have no insecure fallback in
// production — tests need their own (non-production) values so routes that
// call getSecret(...) don't throw "not set in environment variables".
process.env.JWT_SECRET ??= 'vitest-test-jwt-secret-do-not-use-in-production';
process.env.NEXTAUTH_SECRET ??= 'vitest-test-nextauth-secret-do-not-use-in-prod';
process.env.TURN_SECRET ??= 'vitest-test-turn-secret-do-not-use-in-production';
