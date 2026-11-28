'use server';

import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

/**
 * Server action to securely delete one or multiple past papers.
 * Ensures that:
 * 1. The user owns the papers (or is an admin).
 * 2. Child tables (questions, pages, attempts, answers) are cleanly pruned.
 * 3. Cache and path revalidations occur reliably without relying on Express.
 */
export async function deletePastPapers(paperIds: string[]) {
  try {
    if (!paperIds || !Array.isArray(paperIds) || paperIds.length === 0) {
      return { success: false, error: 'No paper IDs provided' };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const admin = getAdminClient();

    // 1. Verify user role or ownership
    const { data: profile } = await (admin.from('profiles') as any)
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = profile?.role === 'admin';

    // 2. Fetch the target papers to ensure user owns them
    let papersQuery = (admin.from('past_papers') as any)
      .select('id, user_id')
      .in('id', paperIds);

    if (!isAdmin) {
      papersQuery = papersQuery.eq('user_id', user.id);
    }

    const { data: authorizedPapers, error: fetchErr } = await papersQuery;
    if (fetchErr) {
      console.error('[deletePastPapers] Error verifying ownership:', fetchErr);
      return { success: false, error: fetchErr.message };
    }

    if (!authorizedPapers || authorizedPapers.length === 0) {
      return { success: false, error: 'No authorized past papers found to delete' };
    }

    const validIds = (authorizedPapers as Array<{ id: string }>).map((p) => p.id);

    // 3. Prune all dependent child rows using admin client
    // Note: past_paper_attempts might have past_paper_answers
    try {
      const { data: attempts } = await (admin.from('past_paper_attempts') as any)
        .select('id')
        .in('past_paper_id', validIds);

      if (attempts && attempts.length > 0) {
        const attemptIds = (attempts as Array<{ id: string }>).map((a) => a.id);
        await (admin.from('past_paper_answers') as any).delete().in('attempt_id', attemptIds);
      }
    } catch (answersErr) {
      console.warn('[deletePastPapers] Notice pruning answers:', answersErr);
    }

    // Prune child tables
    await Promise.allSettled([
      admin.from('past_paper_questions').delete().in('past_paper_id', validIds),
      admin.from('past_paper_pages').delete().in('past_paper_id', validIds),
      admin.from('past_paper_attempts').delete().in('past_paper_id', validIds),
    ]);

    // 4. Delete the parent past_paper rows
    const { error: delErr } = await admin
      .from('past_papers')
      .delete()
      .in('id', validIds);

    if (delErr) {
      console.error('[deletePastPapers] Error deleting past papers:', delErr);
      return { success: false, error: delErr.message };
    }

    revalidatePath('/dashboard/past-papers');
    revalidatePath('/dashboard');
    return { success: true, count: validIds.length };
  } catch (err: any) {
    console.error('[deletePastPapers] Exception:', err);
    return { success: false, error: err?.message || 'Failed to delete past paper' };
  }
}
