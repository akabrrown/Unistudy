'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface UpdateAcademicProfileInput {
  full_name?: string;
  username?: string;
  year_of_study?: number | null;
  degree_programme?: string;
  institution_id?: string;
  study_goal?: string;
}

export async function updateAcademicProfile(data: UpdateAcademicProfileInput) {
  try {
    const supabase = await createClient();
    const { data: userData, error: authError } = await supabase.auth.getUser();

    if (authError || !userData?.user) {
      return { error: 'Unauthorized' };
    }

    const userId = userData.user.id;

    // Validate & check username uniqueness if provided
    let normalizedUsername: string | undefined;
    if (data.username !== undefined) {
      const cleaned = data.username.trim().replace(/^@/, '').toLowerCase();
      if (cleaned.length > 0) {
        if (!/^[a-z0-9_]{3,30}$/.test(cleaned)) {
          return {
            error: 'Username must be 3–30 characters using lowercase letters, numbers, or underscores.',
          };
        }
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', cleaned)
          .neq('id', userId)
          .maybeSingle();

        if (existingUser) {
          return { error: `Username @${cleaned} is already taken.` };
        }
        normalizedUsername = cleaned;
      }
    }

    let finalInstitutionId: string | null = null;
    let customUniversityName: string | undefined;

    if (data.institution_id && data.institution_id.trim()) {
      const rawInst = data.institution_id.trim();
      const isUuid =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
          rawInst
        );
      if (isUuid) {
        finalInstitutionId = rawInst;
      } else {
        // Look up institution by name
        const { data: existingInst } = await supabase
          .from('institutions')
          .select('id')
          .ilike('name', rawInst)
          .maybeSingle();

        if (existingInst?.id) {
          finalInstitutionId = existingInst.id;
        } else {
          // If not in database, store as university name text on profiles
          customUniversityName = rawInst;
        }
      }
    }

    const payload: Record<string, unknown> = {};
    if (data.full_name !== undefined) {
      payload.full_name = data.full_name.trim().slice(0, 100);
    }
    if (normalizedUsername !== undefined) {
      payload.username = normalizedUsername;
    }
    if (data.year_of_study !== undefined) {
      payload.year_of_study = data.year_of_study;
    }
    if (data.degree_programme !== undefined) {
      const cleanDegree = data.degree_programme.trim().slice(0, 120);
      payload.degree_programme = cleanDegree;
      payload.degree = cleanDegree;
    }
    if (finalInstitutionId !== null) {
      payload.institution_id = finalInstitutionId;
    }
    if (customUniversityName) {
      payload.university = customUniversityName;
    }
    if (data.study_goal !== undefined) {
      payload.study_goal = data.study_goal.trim().slice(0, 200);
    }

    // Try primary update
    let updateError: any = null;
    const firstAttempt = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId);

    updateError = firstAttempt.error;

    // Fallback: If study_goal column doesn't exist in profiles table (PGRST204 / 42703), retry without study_goal
    if (updateError && payload.study_goal !== undefined) {
      const sanitizedPayload = { ...payload };
      delete sanitizedPayload.study_goal;
      const retryAttempt = await supabase
        .from('profiles')
        .update(sanitizedPayload)
        .eq('id', userId);
      updateError = retryAttempt.error;
    }

    // Also persist study_goal and academic details in user_metadata for reliable real-time retrieval
    if (data.study_goal !== undefined || data.year_of_study !== undefined || data.full_name !== undefined) {
      try {
        await supabase.auth.updateUser({
          data: {
            ...(data.study_goal ? { study_goal: data.study_goal.trim() } : {}),
            ...(data.year_of_study ? { year_of_study: data.year_of_study } : {}),
            ...(data.full_name ? { full_name: data.full_name.trim() } : {}),
          },
        });
      } catch (authMetaErr) {
        console.warn('Failed to update auth metadata for study_goal:', authMetaErr);
      }
    }

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return { error: updateError.message || 'Failed to update academic profile' };
    }

    revalidatePath('/dashboard/settings/profile');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/settings');

    return { success: true };
  } catch (error: unknown) {
    console.error('updateAcademicProfile exception:', error);
    return {
      error:
        'An unexpected error occurred: ' +
        (error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}
