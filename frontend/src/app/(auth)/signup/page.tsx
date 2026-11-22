import Link from 'next/link';
import { signup } from '../actions';
import { Button } from '@/components/ui/button';
import { AuthSplitLayout } from '../components/AuthSplitLayout';
import { AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

import { EmailField } from './components/EmailField';
import { UsernameField } from './components/UsernameField';
import { PasswordStrengthField } from './components/PasswordStrengthField';
import { FullNameField } from './components/FullNameField';

export default async function SignupPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;

  return (
    <AuthSplitLayout
      badge="Join the UPSA Cohort"
      title="Unlock Your Academic Potential"
      description="Create your student account to access AI study decks, intelligent past paper grading, and 20 free complimentary AI study credits."
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2 text-left">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D89A06]/15 text-[#D89A06] dark:text-[#D89A06] text-[11px] font-bold">
            <Sparkles className="w-3 h-3" />
            <span>Includes 20 Free AI Study Credits</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Create Your Account
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enter your student details to activate your UPSA scholar workspace.
          </p>
        </div>

        {/* Error Alert */}
        {searchParams?.error && (
          <div className="flex items-start gap-3 p-3.5 text-xs sm:text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-destructive" />
            <span className="leading-snug font-medium">{searchParams.error}</span>
          </div>
        )}

        {/* Form */}
        <form action={signup} autoComplete="off" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FullNameField />
            <UsernameField />
          </div>

          <EmailField />
          <PasswordStrengthField />

          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-[#00004E] hover:bg-[#000038] text-white dark:bg-[#D89A06] dark:hover:bg-[#c48b05] dark:text-[#00004E] font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 mt-4"
          >
            <span>Create Scholar Account</span>
            <ArrowRight className="w-4 h-4" />
          </Button>

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed pt-1">
            By creating an account, you agree to our{' '}
            <Link href="/terms" target="_blank" className="font-semibold text-foreground hover:text-[#D89A06] underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" target="_blank" className="font-semibold text-foreground hover:text-[#D89A06] underline">
              Privacy Policy
            </Link>.
          </p>
        </form>

        {/* Footer Toggle */}
        <div className="pt-4 border-t border-border/60 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-bold text-[#00004E] dark:text-[#D89A06] hover:underline transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
