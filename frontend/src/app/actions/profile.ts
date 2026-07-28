'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateAcademicProfile(data: { year_of_study?: number, degree_programme?: string, institution_id?: string }) {
  try {
    const supabase = await createClient()
    const { data: userData, error: authError } = await supabase.auth.getUser()

    if (authError || !userData?.user) {
      return { error: 'Unauthorized' }
    }

    let final_institution_id = data.institution_id
    if (data.institution_id) {
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(data.institution_id);
      if (!isUuid) {
        const { data: existingInst } = await supabase
          .from('institutions')
          .select('id')
          .ilike('name', data.institution_id)
          .maybeSingle();

        if (existingInst) {
          final_institution_id = existingInst.id;
        } else {
          const { data: newInst } = await supabase
            .from('institutions')
            .insert({ name: data.institution_id, type: 'university' })
            .select('id')
            .single();

          if (newInst) {
            final_institution_id = newInst.id;
          }
        }
      }
    }

    const payload: any = {}
    if (data.year_of_study !== undefined) payload.year_of_study = data.year_of_study
    if (data.degree_programme !== undefined) payload.degree_programme = data.degree_programme
    if (final_institution_id !== undefined) payload.institution_id = final_institution_id

    const { error: updateError } = await supabase
      .from('profiles')
      .update(payload)
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
