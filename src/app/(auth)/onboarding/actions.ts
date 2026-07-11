'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const university = formData.get('university') as string
  const degree = formData.get('degree') as string
  const year_of_study = parseInt(formData.get('year_of_study') as string, 10) || 1
  const learning_style = formData.get('learning_style') as string
  const tutor_name = formData.get('tutor_name') as string
  const tutor_personality = formData.get('tutor_personality') as string

  const { error } = await supabase
    .from('profiles')
    .update({
      university,
      degree,
      year_of_study,
      learning_style,
      tutor_name,
      tutor_personality
    })
    .eq('id', user.id)

  if (error) {
    console.error('Onboarding update failed:', error)
    // Could redirect back with error
    return { error: 'Failed to update profile' }
  }

  redirect('/dashboard')
}
