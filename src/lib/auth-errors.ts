export type AuthErrorKind =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'user_exists'
  | 'weak_password'
  | 'same_password'
  | 'rate_limited'
  | 'network'
  | 'unknown';

/** Maps Supabase auth errors (by code, falling back to message text) to a stable kind. */
export function authErrorKind(error: unknown): AuthErrorKind {
  const e = (error ?? {}) as { code?: string; message?: string; status?: number; name?: string };
  const code = e.code ?? '';
  const message = e.message ?? '';
  if (code === 'invalid_credentials' || message.includes('Invalid login credentials')) return 'invalid_credentials';
  if (code === 'email_not_confirmed' || message.includes('Email not confirmed')) return 'email_not_confirmed';
  if (code === 'user_already_exists' || message.includes('already registered')) return 'user_exists';
  // Before weak_password: "New password should be different…" also contains "password should"
  if (code === 'same_password' || /different from the old password/i.test(message)) return 'same_password';
  if (code === 'weak_password' || /password should (be at least|contain)/i.test(message)) return 'weak_password';
  if (code.startsWith('over_') || e.status === 429) return 'rate_limited';
  if (e.name === 'AuthRetryableFetchError' || message.includes('Failed to fetch')) return 'network';
  return 'unknown';
}

const ERROR_MESSAGES: Record<AuthErrorKind, string> = {
  invalid_credentials: "That email and password don't match. Try again or reset your password.",
  email_not_confirmed: 'Confirm your email first by opening the link we sent you.',
  user_exists: 'An account with this email already exists. Sign in instead.',
  weak_password: 'Choose a stronger password with at least 6 characters.',
  same_password: 'Choose a password different from your current one.',
  rate_limited: 'Too many attempts. Wait a minute and try again.',
  network: "We can't reach the server. Check your connection and try again.",
  unknown: 'Something went wrong. Please try again.',
};

export function authErrorMessage(error: unknown): string {
  return ERROR_MESSAGES[authErrorKind(error)];
}
