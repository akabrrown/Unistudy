import { OnboardingForm } from './OnboardingForm';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UniStudyLogo } from '@/components/brand/UniStudyLogo';
import Link from 'next/link';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch existing profile metadata for personalization
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('id', user.id)
    .maybeSingle();

  const studentName = profile?.full_name || profile?.username || user.user_metadata?.full_name || user.email?.split('@')[0] || 'UPSA Scholar';

  return (
    <div className="min-h-screen bg-background relative flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      {/* Background ambient gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00004E]/10 via-background to-background -z-10" />

      {/* Top Header */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between pb-6 border-b border-border/50">
        <UniStudyLogo variant="primary" height={36} showSubtitle={false} />
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Logged in as <strong className="text-foreground">{user.email}</strong>
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground py-1.5 px-3 rounded-lg border border-border/70 hover:bg-muted transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Main Form Center */}
      <main className="my-auto py-8">
        <OnboardingForm studentName={studentName} userEmail={user.email} />
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto text-center pt-6 border-t border-border/50 text-[11px] text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>University of Professional Studies, Accra (UPSA) • Academic Portal</span>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:underline">Terms</Link>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
