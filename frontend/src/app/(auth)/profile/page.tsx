import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  let profileData = profile;
  let institutionName = 'Not provided';

  if (profileData?.institution_id) {
    // If it looks like a UUID, fetch the name
    const id = profileData.institution_id.trim();
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    console.log('[ProfilePage] Check UUID:', id, 'isUuid:', isUuid);
    
    if (isUuid) {
      // Use admin client to guarantee we bypass any read restrictions
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data: inst, error: instErr } = await supabaseAdmin
        .from('institutions')
        .select('name')
        .eq('id', id)
        .maybeSingle();
      
      console.log('[ProfilePage] Institution fetched:', inst, 'Error:', instErr);
        
      if (inst && inst.name) {
        institutionName = inst.name;
      } else {
        // Fallback if UUID not found in institutions table
        institutionName = 'Unknown Institution'; 
      }
    } else {
      // If it's somehow not a UUID but a string name
      institutionName = id;
    }
  }

  console.log('[ProfilePage] Final institutionName:', institutionName);

  const initial = profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative py-12">
      {/* Back navigation */}
      <Link
        href="/dashboard"
        className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      {/* Subtle radial gradient background for premium feel */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/20 via-background to-background -z-10" />

      <Card className="w-full max-w-xl shadow-2xl shadow-primary/10 border-primary/20 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="flex justify-center mb-2">
            <img src="/logo.jpeg" alt="UniStudy AI" className="h-12 w-auto object-contain dark:hidden" />
            <img src="/logo-dark.jpeg" alt="UniStudy AI" className="h-12 w-auto object-contain hidden dark:block" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">Your Profile</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your personal and academic details
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            <div className="flex justify-center mb-4">
              {profileData?.avatar_url ? (
                <img src={profileData.avatar_url} alt="Avatar" className="h-24 w-24 rounded-full object-cover border" />
              ) : (
                <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center text-4xl font-semibold text-muted-foreground">
                  {initial}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" name="fullName" value={profileData?.full_name || ''} readOnly className="bg-background/50 cursor-not-allowed" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" name="email" value={profileData?.email || user.email || ''} readOnly className="bg-background/50 cursor-not-allowed" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="institution">Institution</Label>
                <Input id="institution" name="institution" value={institutionName} readOnly className="bg-background/50 cursor-not-allowed" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="degree">Degree Programme</Label>
                <Input id="degree" name="degree" value={profileData?.degree_programme || 'Not provided'} readOnly className="bg-background/50 cursor-not-allowed" />
              </div>
            </div>

            <Link href="/dashboard/settings/profile" className="w-full block mt-6">
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 text-white"
              >
                Edit Profile Details
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
