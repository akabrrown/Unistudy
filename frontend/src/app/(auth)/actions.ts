'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function isPasswordLeaked(password: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!response.ok) return false;
    
    const text = await response.text();
    const lines = text.split('\n');
    for (const line of lines) {
      const [lineSuffix] = line.split(':');
      if (lineSuffix.trim() === suffix) {
        return true;
      }
    }
  } catch (e) {
    console.error('Error checking password leak:', e);
  }
  return false;
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/login?error=Invalid email or password')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const desiredUsername = formData.get('username') as string;

  // Server-side username uniqueness check (bypassing RLS)
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: existingUser } = await adminSupabase
    .from('profiles')
    .select('username')
    .eq('username', desiredUsername)
    .maybeSingle();

  if (existingUser) {
    redirect(`/signup?error=Username '${desiredUsername}' is already taken. Please choose another.`);
  }

  const password = formData.get('password') as string;
  const isLeaked = await isPasswordLeaked(password);
  
  if (isLeaked) {
    redirect(`/signup?error=This password has appeared in a data breach. Please choose a different, more secure password.`);
  }

  const data = {
    email: formData.get('email') as string,
    password,
    options: {
      data: {
        username: formData.get('username') as string,
        full_name: formData.get('fullName') as string,
        avatar_url: formData.get('avatar_url') as string,
        avatar_type: formData.get('avatar_type') as string,
        institutional_email: formData.get('institutional_email') as string,
        email_is_institutional: formData.get('email_is_institutional') === 'true',
        institution_id: formData.get('institution_id') as string,
        degree_programme: formData.get('degree_programme') as string,
        study_frequency: formData.get('study_frequency') as string,
        year_of_study: formData.get('year_of_study') as string,
        study_hours_per_session: formData.get('study_hours_per_session') as string,
      },
    },
  };

  const { data: authData, error } = await supabase.auth.signUp(data);

  if (error) {
    redirect(`/signup?error=${error.message}`);
  }

  // Refresh materialised view
  await supabase.rpc('refresh_institution_student_counts');

  // Trigger initial planner generation in the background
  if (authData?.user?.id) {
    try {
      // Force update profile with the additional fields using an admin client to bypass RLS delays
      const { createClient } = await import('@supabase/supabase-js');
      const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      await adminSupabase.from('profiles').update({
        username: formData.get('username') as string,
        full_name: formData.get('fullName') as string,
        institution_id: formData.get('institution_id') as string || null,
        degree_programme: formData.get('degree_programme') as string || null,
        study_frequency: formData.get('study_frequency') as string || null,
        year_of_study: parseInt(formData.get('year_of_study') as string, 10) || null,
      }).eq('id', authData.user.id);
      
      // Use absolute URL since this is a server action
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      fetch(`${baseUrl}/api/planner/generate-initial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authData.user.id }),
      }).catch(err => console.error('Failed to trigger planner generation:', err));
    } catch (e) {
      console.error('Error triggering planner:', e);
    }
  }

  revalidatePath('/', 'layout');
  redirect('/onboarding');
}


export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
