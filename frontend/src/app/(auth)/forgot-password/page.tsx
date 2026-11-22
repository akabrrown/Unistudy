'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { AuthSplitLayout } from '../components/AuthSplitLayout';
import { 
  ArrowLeft, 
  Loader2, 
  Mail, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RotateCcw,
  Lock
} from 'lucide-react';
import Link from 'next/link';

const OTP_LENGTH = 6;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown for resending OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 1: Request Reset
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');
    const supabase = createClient();
    
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
    
    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setResendCooldown(60);
    setStep(2);
    setLoading(false);
  };

  // Step 2: Handle OTP input & Paste
  const handleOtpChange = (index: number, value: string) => {
    // Check if pasted multiple characters
    if (value.length > 1) {
      const cleaned = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
      if (cleaned.length > 0) {
        const next = [...otp];
        for (let i = 0; i < OTP_LENGTH; i++) {
          next[i] = cleaned[i] || '';
        }
        setOtp(next);
        const focusIdx = Math.min(cleaned.length, OTP_LENGTH - 1);
        inputRefs.current[focusIdx]?.focus();
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

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const next = [...otp];
    for (let i = 0; i < OTP_LENGTH; i++) {
      next[i] = pasted[i] || '';
    }
    setOtp(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the full 6-digit code sent to your email.');
      return;
    }

    setLoading(true);
    setError('');
    const supabase = createClient();

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: 'recovery',
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }

    setStep(3);
    setLoading(false);
  };

  // Step 3: Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword.length > 128) {
      setError('Password cannot exceed 128 characters.');
      return;
    }

    setLoading(true);
    setError('');
    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setStep(4);
    setLoading(false);
  };

  return (
    <AuthSplitLayout
      badge="Account Recovery"
      title="Secure Password Recovery"
      description="Restore access to your UniStudy scholar account through encrypted one-time verification."
    >
      <div className="space-y-6">
        {/* Step Indicator Pills */}
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {[
              { num: 1, label: 'Email' },
              { num: 2, label: 'Code' },
              { num: 3, label: 'Reset' },
              { num: 4, label: 'Done' },
            ].map((s) => {
              const isCurrent = step === s.num;
              const isCompleted = step > s.num;
              return (
                <div key={s.num} className="flex items-center gap-1.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      isCurrent
                        ? 'bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] ring-2 ring-[#D89A06]/40'
                        : isCompleted
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span
                    className={`text-[11px] font-medium hidden sm:inline ${
                      isCurrent ? 'text-foreground font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    {s.label}
                  </span>
                  {s.num < 4 && <span className="text-border mx-0.5">•</span>}
                </div>
              );
            })}
          </div>

          <Link
            href="/login"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Cancel</span>
          </Link>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-3 p-3.5 text-xs sm:text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-destructive" />
            <span className="leading-snug font-medium">{error}</span>
          </div>
        )}

        {/* ── STEP 1: Enter Email ── */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="space-y-1.5 text-left">
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                Forgot Your Password?
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enter your registered university email. We will dispatch a 6-digit verification code.
              </p>
            </div>

            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                  Student / University Email
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@upsamail.edu.gh"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 rounded-xl bg-background border-border/80 focus:border-[#D89A06] focus:ring-2 focus:ring-[#D89A06]/20 transition-all text-sm"
                  />
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full h-11 rounded-xl bg-[#00004E] hover:bg-[#000038] text-white dark:bg-[#D89A06] dark:hover:bg-[#c48b05] dark:text-[#00004E] font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* ── STEP 2: Verify OTP ── */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="space-y-1.5 text-left">
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                Enter 6-Digit Code
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We sent a recovery token to{' '}
                <strong className="text-foreground font-mono">{email}</strong>.
              </p>
            </div>

            <div className="space-y-6">
              <div 
                className="flex justify-between gap-1.5 sm:gap-2.5"
                onPaste={handleOtpPaste}
              >
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="h-12 w-11 sm:h-14 sm:w-12 rounded-xl border-2 border-border/80 bg-background text-center text-xl font-mono font-bold text-foreground outline-hidden transition-all focus:border-[#D89A06] focus:ring-2 focus:ring-[#D89A06]/20 shadow-2xs"
                  />
                ))}
              </div>

              <Button
                onClick={handleVerifyOtp}
                disabled={loading || otp.join('').length !== OTP_LENGTH}
                className="w-full h-11 rounded-xl bg-[#00004E] hover:bg-[#000038] text-white dark:bg-[#D89A06] dark:hover:bg-[#c48b05] dark:text-[#00004E] font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify &amp; Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              <div className="text-center pt-2">
                {resendCooldown > 0 ? (
                  <p className="text-xs text-muted-foreground font-mono">
                    Resend code available in {resendCooldown}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestReset}
                    disabled={loading}
                    className="text-xs font-semibold text-[#00004E] dark:text-[#D89A06] hover:underline inline-flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Didn&apos;t receive code? Resend</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Create New Password ── */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="space-y-1.5 text-left">
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                Set New Password
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Code verified. Choose a strong, memorable password for your scholar account.
              </p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-xs font-semibold text-foreground">
                  New Password (min 8 characters)
                </Label>
                <div className="relative">
                  <PasswordInput
                    id="newPassword"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 h-11 rounded-xl bg-background border-border/80 focus:border-[#D89A06] focus:ring-2 focus:ring-[#D89A06]/20 transition-all text-sm"
                  />
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || newPassword.length < 8}
                className="w-full h-11 rounded-xl bg-[#00004E] hover:bg-[#000038] text-white dark:bg-[#D89A06] dark:hover:bg-[#c48b05] dark:text-[#00004E] font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Save &amp; Complete Reset</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* ── STEP 4: Success Confirmation ── */}
        {step === 4 && (
          <div className="space-y-6 text-center py-4 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
                Password Reset Successfully
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Your credentials have been securely updated. You can now access your courses and lecture materials.
              </p>
            </div>

            <Button
              onClick={() => router.replace('/login')}
              className="w-full h-11 rounded-xl bg-[#00004E] hover:bg-[#000038] text-white dark:bg-[#D89A06] dark:hover:bg-[#c48b05] dark:text-[#00004E] font-bold text-sm shadow-sm transition-all"
            >
              Proceed to Sign In
            </Button>
          </div>
        )}
      </div>
    </AuthSplitLayout>
  );
}
