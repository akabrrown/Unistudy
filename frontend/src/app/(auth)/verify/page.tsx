'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { AuthSplitLayout } from '../components/AuthSplitLayout';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import Link from 'next/link';

const OTP_LENGTH = 6;

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    // Support mobile SMS/email autofill delivering multiple digits at once
    if (value.length > 1) {
      const cleaned = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
      if (cleaned.length > 0) {
        const next = [...otp];
        for (let i = 0; i < OTP_LENGTH; i++) {
          next[i] = cleaned[i] || '';
        }
        setOtp(next);
        setError('');
        const focusIndex = Math.min(cleaned.length, OTP_LENGTH - 1);
        inputRefs.current[focusIndex]?.focus();
      }
      return;
    }

    if (!/^\d?$/.test(value)) return;

    const next = [...otp];
    next[index] = value;
    setOtp(next);
    setError('');

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const next = [...otp];
    for (let i = 0; i < OTP_LENGTH; i++) {
      next[i] = pasted[i] || '';
    }
    setOtp(next);
    setError('');
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setError('Enter the full 6-digit verification code.');
      return;
    }

    setVerifying(true);
    setError('');

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'signup',
    });

    if (verifyError) {
      setError(verifyError.message);
      setVerifying(false);
      return;
    }

    router.replace('/onboarding');
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    setResending(true);
    setError('');

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (resendError) {
      setError(resendError.message);
    } else {
      setResent(true);
      setResendCooldown(60);
      setTimeout(() => setResent(false), 4000);
    }
    setResending(false);
  };

  return (
    <AuthSplitLayout
      badge="Email Verification"
      title="Verify Your University Email"
      description="Confirm your student email address to unlock your courses, study decks, and 20 starter credits."
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            One-Time Verification
          </span>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Change Email</span>
          </Link>
        </div>

        <div className="space-y-1.5 text-left">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Check Your Inbox
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enter the 6-digit verification code sent to{' '}
            <strong className="font-mono text-foreground">{email || 'your email'}</strong>.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-3.5 text-xs sm:text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-destructive" />
            <span className="leading-snug font-medium">{error}</span>
          </div>
        )}

        {resent && (
          <div className="flex items-center gap-2.5 p-3 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span className="font-medium">Fresh 6-digit code sent — check your inbox or spam folder.</span>
          </div>
        )}

        <div className="space-y-6">
          <div className="flex justify-between gap-1.5 sm:gap-2.5" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label={`Verification code digit ${i + 1}`}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-12 w-11 sm:h-14 sm:w-12 rounded-xl border-2 border-border/80 bg-background text-center text-xl font-mono font-bold tabular-nums text-foreground outline-hidden transition-all focus:border-[#D89A06] focus:ring-2 focus:ring-[#D89A06]/20 shadow-2xs"
              />
            ))}
          </div>

          <Button
            onClick={handleVerify}
            disabled={verifying || otp.join('').length !== OTP_LENGTH}
            className="w-full h-11 rounded-xl bg-[#00004E] hover:bg-[#000038] text-white dark:bg-[#D89A06] dark:hover:bg-[#c48b05] dark:text-[#00004E] font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {verifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying Email...</span>
              </>
            ) : (
              <>
                <span>Verify &amp; Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          <div className="text-center pt-1">
            {resendCooldown > 0 ? (
              <p className="text-xs font-mono tabular-nums text-muted-foreground">
                Resend available in {resendCooldown}s
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || !email}
                className="text-xs font-semibold text-[#00004E] dark:text-[#D89A06] hover:underline inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{resending ? 'Sending code...' : "Didn't get a code? Resend"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </AuthSplitLayout>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md p-8 rounded-2xl border border-border/60 bg-card space-y-6 animate-pulse">
            <div className="h-6 w-48 bg-muted rounded" />
            <div className="h-4 w-64 bg-muted/60 rounded" />
            <div className="flex justify-between gap-2 py-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-12 h-14 rounded-xl bg-muted/40 border border-border" />
              ))}
            </div>
            <div className="h-11 w-full bg-muted rounded-xl" />
          </div>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
