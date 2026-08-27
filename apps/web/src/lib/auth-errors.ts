/**
 * Why a sign-in step failed. Each one needs a different message: waiting
 * helps a rate limit, retyping helps a bad code, and neither helps a
 * mistyped address.
 */
export type AuthFailure = 'invalid-email' | 'rate-limited' | 'bad-code' | 'unknown';

/** Maps Supabase's error codes and messages onto the reasons above. */
export const classifyAuthError = (code: string | undefined, message: string): AuthFailure => {
  const text = `${code ?? ''} ${message}`.toLowerCase();
  if (text.includes('rate limit') || text.includes('over_email_send_rate') || text.includes('too many')) {
    return 'rate-limited';
  }
  // Email checks run before the code checks: "Unable to validate email
  // address: invalid format" also contains the word "invalid".
  if (
    text.includes('email_address_invalid') ||
    text.includes('validate email') ||
    text.includes('validation_failed')
  ) {
    return 'invalid-email';
  }
  // Supabase answers a wrong code and a stale code with the same otp_expired
  // ("Token has expired or is invalid"), so both map to one honest message.
  if (text.includes('otp_expired') || text.includes('expired') || text.includes('token') || text.includes('otp')) {
    return 'bad-code';
  }
  return 'unknown';
};

