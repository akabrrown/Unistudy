'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateAcademicProfile(data: { year_of_study: number, degree_programme: string }) {
  try {
    const supabase = await createClient()
    const { data: userData, error: authError } = await supabase.auth.getUser()

    if (authError || !userData?.user) {
      return { error: 'Unauthorized' }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        year_of_study: data.year_of_study,
        degree_programme: data.degree_programme
      })
      .eq('id', userData.user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return { error: 'Failed to update academic profile' }
    }

    revalidatePath('/dashboard/settings/profile')

    return { success: true }
  } catch (error: any) {
    console.error('updateAcademicProfile exception:', error)
    return { error: 'An unexpected error occurred: ' + error.message }
  }
}
