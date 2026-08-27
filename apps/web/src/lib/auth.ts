'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { AuthFailure } from './auth-errors';
import { getSupabase } from './supabase';
import { classifyAuthError } from './auth-errors';

export type { AuthFailure } from './auth-errors';

/**
 * Why a sign-in step failed. Each one needs a different message: waiting
 * helps a rate limit, retyping helps a bad code, and neither helps a
 * mistyped address.
 */

export interface AuthState {
  /** false when Supabase env vars are absent — hide account UI entirely. */
  readonly enabled: boolean;
  readonly user: User | null;
  readonly sendCode: (email: string) => Promise<AuthFailure | null>;
  readonly verifyCode: (email: string, code: string) => Promise<AuthFailure | null>;
  readonly signOut: () => Promise<void>;
}

export const useAuth = (): AuthState => {
  const supabase = getSupabase();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const sendCode = useCallback(
    async (email: string): Promise<AuthFailure | null> => {
      if (!supabase) return 'unknown';
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      return error ? classifyAuthError(error.code, error.message) : null;
    },
    [supabase],
  );

  const verifyCode = useCallback(
    async (email: string, code: string): Promise<AuthFailure | null> => {
      if (!supabase) return 'unknown';
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
      return error ? classifyAuthError(error.code, error.message) : null;
    },
    [supabase],
  );

  const signOut = useCallback(async (): Promise<void> => {
    await getSupabase()?.auth.signOut();
  }, []);

  return { enabled: supabase !== null, user, sendCode, verifyCode, signOut };
};
