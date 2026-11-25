import { OnboardingForm } from './OnboardingForm';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UniStudyLogo } from '@/components/brand/UniStudyLogo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { SignOutSubmitButton } from '@/components/layout/SignOutSubmitButton';
import Link from 'next/link';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('id', user.id)
    .maybeSingle();

  const studentName =
    profile?.full_name ||
    profile?.username ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'UPSA Scholar';

  return (
    <div className="min-h-screen bg-background relative flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00004E]/[0.06] via-background to-background -z-10" />

      {/* Top Header */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between pb-5 border-b border-border/50">
        <UniStudyLogo variant="primary" height={34} showSubtitle={false} />

        <div className="flex items-center gap-2.5">
          <span className="text-xs text-muted-foreground hidden sm:inline font-mono">
            {user.email}
          </span>
          <ThemeToggle />
          <form action="/auth/signout" method="post">
            <SignOutSubmitButton label="Sign Out" />
          </form>
        </div>
      </header>

      {/* Main Form Center */}
      <main className="my-auto py-8">
        <OnboardingForm studentName={studentName} userEmail={user.email} />
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto text-center pt-5 border-t border-border/50 text-[11px] text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>University of Professional Studies, Accra · Student Workspace</span>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
