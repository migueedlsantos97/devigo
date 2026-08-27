import { describe, expect, it } from 'vitest';
import { classifyAuthError } from './auth-errors';

/**
 * The strings below are verbatim responses captured from the live Supabase
 * project, not invented samples — the classifier exists because the generic
 * word "invalid" appears in several of them and the order of checks matters.
 */
describe('classifyAuthError', () => {
  it('reads a malformed address as an email problem, not a code problem', () => {
    expect(
      classifyAuthError('validation_failed', 'Unable to validate email address: invalid format'),
    ).toBe('invalid-email');
  });

  it('reads a rejected domain as an email problem', () => {
    expect(
      classifyAuthError('email_address_invalid', 'Email address "x@example.com" is invalid'),
    ).toBe('invalid-email');
  });

  it('reads a wrong or stale code as a code problem', () => {
    expect(classifyAuthError('otp_expired', 'Token has expired or is invalid')).toBe('bad-code');
  });

  it('reads send throttling as rate limiting', () => {
    expect(
      classifyAuthError('over_email_send_rate_limit', 'For security purposes, you can only request this after 54 seconds'),
    ).toBe('rate-limited');
    expect(classifyAuthError(undefined, 'Email rate limit exceeded')).toBe('rate-limited');
  });

  it('falls back to unknown for anything unrecognised', () => {
    expect(classifyAuthError(undefined, 'Service unavailable')).toBe('unknown');
    expect(classifyAuthError(undefined, '')).toBe('unknown');
  });
});
