'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UPSA_INSTITUTION } from '@/lib/constants/upsa'

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const faculty = (formData.get('faculty') as string) || 'FITCS'
  const department = (formData.get('department') as string) || null
  const degree_programme = (formData.get('degree_programme') as string) || 'BSc Information Technology Management'
  const year_of_study = Number(formData.get('year_of_study')) || 100
  const learning_style = (formData.get('learning_style') as string) || 'adaptive'
  const tutor_name = (formData.get('tutor_name') as string) || 'Alex'
  const tutor_personality = (formData.get('tutor_personality') as string) || 'encouraging'
  const tutor_tone = (formData.get('tutor_tone') as string) || 'academic'

  // Fetch canonical UPSA institution record
  let upsaInstitutionId: string = UPSA_INSTITUTION.id
  try {
    const { data: upsa } = await supabase
      .from('institutions')
      .select('id')
      .or(`abbreviation.eq.UPSA,name.ilike.%Professional Studies%`)
      .limit(1)
      .maybeSingle()

    if (upsa?.id) {
      upsaInstitutionId = upsa.id
    }
  } catch {
    // Keep fallback
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      institution_id: upsaInstitutionId,
      university: UPSA_INSTITUTION.name,
      faculty,
      department,
      degree_programme,
      year_of_study,
      tutor_name,
      tutor_personality,
    })
    .eq('id', user.id)

  if (error) {
    console.error('Onboarding update failed:', error)
    return { error: 'Failed to update profile' }
  }

  // Sync AI tutor settings to user_settings
  await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      ai_tutor_name: tutor_name,
      ai_personality: tutor_personality,
      ai_tone: tutor_tone,
      learning_style: learning_style,
    })

  // Atomically disburse the 20 Free Welcome Bonus AI Credits
  try {
    const { data: bonusData, error: bonusError } = await supabase.rpc('claim_welcome_bonus', {
      p_user_id: user.id,
    })

    if (bonusError || !bonusData) {
      // Defensive fallback via service role if RPC is not yet registered in database
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
      const adminSupabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: existingWallet } = await adminSupabase
        .from('credit_wallets')
        .select('balance, welcome_bonus_claimed')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!existingWallet) {
        await adminSupabase.from('credit_wallets').insert({
          user_id: user.id,
          balance: 20,
          total_earned: 20,
          welcome_bonus_claimed: true,
          updated_at: new Date().toISOString(),
        })
      } else if (!existingWallet.welcome_bonus_claimed) {
        await adminSupabase
          .from('credit_wallets')
          .update({
            balance: (existingWallet.balance || 0) + 20,
            welcome_bonus_claimed: true,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
      }
    }
  } catch (bonusErr) {
    console.warn('Welcome bonus credit disbursement notice:', bonusErr)
  }

  redirect('/dashboard')
}
