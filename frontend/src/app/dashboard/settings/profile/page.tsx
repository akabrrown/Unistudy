import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AvatarEditor } from './AvatarEditor'
import { AcademicSettingsForm } from './AcademicSettingsForm'

export default async function ProfileSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  let institutionName = 'Not provided';
  if (profile?.institution_id) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(profile.institution_id.trim());
    if (isUuid) {
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data: inst } = await supabaseAdmin
        .from('institutions')
        .select('name')
        .eq('id', profile.institution_id.trim())
        .maybeSingle();
        
      if (inst && inst.name) {
        institutionName = inst.name;
      } else {
        institutionName = 'Unknown Institution'; 
      }
    } else {
      institutionName = profile.institution_id;
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Profile Settings</h1>
      
      <div className="bg-card border rounded-xl p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium">Personal Information</h3>
          <p className="text-sm text-muted-foreground mb-4">Update your profile details and avatar.</p>
          
          <AvatarEditor initialUrl={profile?.avatar_url} initialName={profile?.full_name} />
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Username</label>
              <div className="font-medium">@{profile?.username || 'Not set'}</div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <div className="font-medium text-muted-foreground">{profile?.email}</div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-medium">Academic Details</h3>
          <p className="text-sm text-muted-foreground mb-4">Your university and course of study.</p>
          
          <AcademicSettingsForm 
            initialYear={profile?.year_of_study} 
            initialDegree={profile?.degree_programme} 
            institutionName={institutionName} 
          />
        </div>
      </div>
    </div>
  )
}
