'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

export interface AuthState {
  /** false when Supabase env vars are absent — hide account UI entirely. */
  readonly enabled: boolean;
  readonly user: User | null;
  readonly sendCode: (email: string) => Promise<boolean>;
  readonly verifyCode: (email: string, code: string) => Promise<boolean>;
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
    async (email: string): Promise<boolean> => {
      if (!supabase) return false;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      return !error;
    },
    [supabase],
  );

  const verifyCode = useCallback(
    async (email: string, code: string): Promise<boolean> => {
      if (!supabase) return false;
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
      return !error;
    },
    [supabase],
  );

  const signOut = useCallback(async (): Promise<void> => {
    await getSupabase()?.auth.signOut();
  }, []);

  return { enabled: supabase !== null, user, sendCode, verifyCode, signOut };
};
