import Link from 'next/link';
import { login } from '../actions';
import { Button } from '@/components/ui/button';
import { AuthSubmitButton } from '../components/AuthSubmitButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { AuthSplitLayout } from '../components/AuthSplitLayout';
import { AlertCircle, Lock, Mail, ArrowRight } from 'lucide-react';

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;

  return (
    <AuthSplitLayout
      badge="UPSA Student Portal"
      title="Master Your Courses with Grounded AI"
      description="Access your personalized course decks, past examination papers, and real-time Socratic AI tutoring calibrated directly to your syllabus."
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2 text-left">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Sign In to UniStudy
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enter your university email and password to resume your study sessions.
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
        <form action={login} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold text-foreground">
              Student / University Email
            </Label>
            <div className="relative">
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="student@upsamail.edu.gh"
                required
                autoComplete="email"
                className="pl-10 h-11 rounded-xl bg-background border-border/80 focus:border-[#D89A06] focus:ring-2 focus:ring-[#D89A06]/20 transition-all text-sm"
              />
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold text-foreground">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-[#00004E] dark:text-[#D89A06] hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <PasswordInput
                id="password"
                name="password"
                required
                autoComplete="current-password"
                className="pl-10 h-11 rounded-xl bg-background border-border/80 focus:border-[#D89A06] focus:ring-2 focus:ring-[#D89A06]/20 transition-all text-sm"
              />
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <AuthSubmitButton loadingText="Signing in to UniStudy...">
            Sign In
          </AuthSubmitButton>
        </form>

        {/* Footer Toggle */}
        <div className="pt-4 border-t border-border/60 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Don&apos;t have a scholar account?{' '}
            <Link
              href="/signup"
              className="font-bold text-[#00004E] dark:text-[#D89A06] hover:underline transition-colors"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
