'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const institution_input = formData.get('institution_id') as string
  const degree_programme = formData.get('degree_programme') as string
  const learning_style = formData.get('learning_style') as string
  const tutor_name = formData.get('tutor_name') as string
  const tutor_personality = formData.get('tutor_personality') as string

  let final_institution_id = institution_input;
  
  // If it's not a UUID, we need to find or create the institution
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(institution_input);
  if (!isUuid && institution_input) {
    // 1. Try to find by name
    const { data: existingInst } = await supabase
      .from('institutions')
      .select('id')
      .ilike('name', institution_input)
      .maybeSingle();

    if (existingInst) {
      final_institution_id = existingInst.id;
    } else {
      // 2. Create new institution (bypassing RLS)
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data: newInst, error: instError } = await supabaseAdmin
        .from('institutions')
        .insert({ name: institution_input, type: 'university' })
        .select('id')
        .single();

      if (instError || !newInst) {
        console.error('Failed to create custom institution:', instError);
        return { error: 'Invalid institution selected' };
      }
      final_institution_id = newInst.id;
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      institution_id: final_institution_id,
      degree_programme
    })
    .eq('id', user.id)

  if (error) {
    console.error('Onboarding update failed:', error)
    // Could redirect back with error
    return { error: 'Failed to update profile' }
  }

  // Sync AI tutor settings to user_settings
  await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      ai_tutor_name: tutor_name,
      ai_personality: tutor_personality,
      learning_style: learning_style,
    });

  redirect('/dashboard');
}
