'use client';

import { useState } from 'react';
import type { Dictionary } from '@devigo/i18n';
import { useAuth, type AuthFailure } from '@/lib/auth';

/** Email-code sign-in for cross-device history sync. Hidden when Supabase is unconfigured. */
export function AccountBox({ t }: { t: Dictionary }) {
  const auth = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);

  if (!auth.enabled) return null;

  if (auth.user) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ev-subtle bg-ev-brand px-4 py-2.5">
        <span className="font-mono text-[11.5px] text-ev-light">{t.account.syncedAs(auth.user.email ?? '')}</span>
        <button
          type="button"
          onClick={() => void auth.signOut()}
          className="cursor-pointer border-none bg-transparent font-mono text-[10.5px] text-ink-3 hover:text-ink"
        >
          {t.account.signOut}
        </button>
      </div>
    );
  }

  const sendCode = async (): Promise<void> => {
    if (!email.includes('@')) {
      setFailure('invalid-email');
      return;
    }
    setBusy(true);
    setFailure(null);
    const reason = await auth.sendCode(email.trim());
    setBusy(false);
    if (reason === null) setStep('code');
    else setFailure(reason);
  };

  const verify = async (): Promise<void> => {
    setBusy(true);
    setFailure(null);
    const reason = await auth.verifyCode(email.trim(), code.trim());
    setBusy(false);
    setFailure(reason);
  };

  const failureText = (reason: AuthFailure): string => {
    switch (reason) {
      case 'invalid-email': return t.account.errorInvalidEmail;
      case 'rate-limited': return t.account.errorRateLimited;
      case 'bad-code': return t.account.errorBadCode;
      case 'unknown': return t.account.error;
    }
  };

  return (
    <div className="rounded-xl border border-edge bg-raised px-4 py-3.5">
      <div className="text-[13px] font-semibold">{t.account.signIn}</div>
      <p className="m-0 mt-1 text-[12px] leading-[1.5] text-ink-3">{t.account.why}</p>
      {step === 'email' ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="email"
            value={email}
            placeholder={t.account.emailPlaceholder}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void sendCode(); }}
            className="min-h-[38px] min-w-[220px] flex-1 rounded-[9px] border border-ctrl bg-transparent px-3 text-[13px] outline-none focus:border-ink-5"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void sendCode()}
            className="min-h-[38px] cursor-pointer rounded-[9px] border border-ev bg-ev px-4 text-[12.5px] font-semibold text-ev-on hover:bg-ev-light disabled:cursor-wait disabled:opacity-70"
          >
            {busy ? t.account.sending : t.account.sendCode}
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <p className="m-0 mb-2 text-[12px] text-ink-2">{t.account.codeSent(email.trim())}</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={code}
              placeholder={t.account.codePlaceholder}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void verify(); }}
              className="min-h-[38px] w-[160px] rounded-[9px] border border-ctrl bg-transparent px-3 font-mono text-[13px] outline-none focus:border-ink-5"
            />
            <button
              type="button"
              disabled={busy || code.trim().length < 6}
              onClick={() => void verify()}
              className="min-h-[38px] cursor-pointer rounded-[9px] border border-ev bg-ev px-4 text-[12.5px] font-semibold text-ev-on hover:bg-ev-light disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t.account.verify}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setCode(''); setFailure(null); }}
              className="min-h-[38px] cursor-pointer rounded-[9px] border border-ctrl-hover bg-transparent px-3 text-[12px] text-ink-2 hover:border-ink-5"
            >
              {t.account.back}
            </button>
          </div>
        </div>
      )}
      {failure !== null && (
        <p className="m-0 mt-2 text-[11.5px] text-danger">{failureText(failure)}</p>
      )}
    </div>
  );
}
