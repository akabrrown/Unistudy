'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/security/adminGuard';

export interface InstitutionWithCount {
  id: string;
  name: string;
  abbreviation: string | null;
  type: string | null;
  domain: string | null;
  country: string | null;
  city: string | null;
  verified: boolean;
  studentCount: number;
  pastPaperCount: number;
}

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function fetchInstitutionCountsAction(): Promise<{ data: InstitutionWithCount[]; error?: string }> {
  try {
    await requireAdmin();
    const supabaseAdmin = getAdminClient();

    const [institutionsRes, profilesRes, pastPapersRes] = await Promise.all([
      supabaseAdmin
        .from('institutions')
        .select('id, name, abbreviation, type, domain, country, city, verified')
        .order('name'),
      supabaseAdmin
        .from('profiles')
        .select('institution_id, university, email'),
      supabaseAdmin
        .from('past_papers')
        .select('institution_id')
    ]);

    if (institutionsRes.error) {
      console.error('Failed to fetch institutions:', institutionsRes.error);
      return { data: [], error: institutionsRes.error.message };
    }

    const countsById = new Map<string, number>();
    const countsByName = new Map<string, number>();

    if (profilesRes.data) {
      for (const p of profilesRes.data) {
        if (p.institution_id) {
          const val = p.institution_id.trim();
          countsById.set(val, (countsById.get(val) || 0) + 1);
          countsByName.set(val.toLowerCase(), (countsByName.get(val.toLowerCase()) || 0) + 1);
        }
        if (p.university) {
          const uVal = p.university.trim().toLowerCase();
          countsByName.set(uVal, (countsByName.get(uVal) || 0) + 1);
        }
      }
    }

    const paperCountsById = new Map<string, number>();
    if (pastPapersRes.data) {
      for (const pp of pastPapersRes.data) {
        if (pp.institution_id) {
          paperCountsById.set(pp.institution_id, (paperCountsById.get(pp.institution_id) || 0) + 1);
        }
      }
    }

    const data: InstitutionWithCount[] = (institutionsRes.data || []).map((inst) => {
      const byId = countsById.get(inst.id) || 0;
      const byName = inst.name ? (countsByName.get(inst.name.toLowerCase().trim()) || 0) : 0;
      const byAbbr = inst.abbreviation ? (countsByName.get(inst.abbreviation.toLowerCase().trim()) || 0) : 0;

      const studentCount = Math.max(byId, byName, byAbbr);
      const pastPaperCount = paperCountsById.get(inst.id) || 0;

      return {
        id: inst.id,
        name: inst.name,
        abbreviation: inst.abbreviation,
        type: inst.type,
        domain: inst.domain,
        country: inst.country || 'Ghana',
        city: inst.city || null,
        verified: !!inst.verified,
        studentCount,
        pastPaperCount
      };
    });

    return { data };
  } catch (err: any) {
    console.error('fetchInstitutionCountsAction error:', err);
    return { data: [], error: err.message || 'Failed to fetch counts' };
  }
}

export async function createInstitutionAction(payload: {
  name: string;
  abbreviation?: string;
  domain?: string;
  type?: string;
  city?: string;
  country?: string;
  verified?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();
    const supabaseAdmin = getAdminClient();

    const { error } = await supabaseAdmin.from('institutions').insert([
      {
        name: payload.name.trim(),
        abbreviation: payload.abbreviation?.trim().toUpperCase() || null,
        domain: payload.domain?.trim().toLowerCase() || null,
        type: payload.type || 'university',
        city: payload.city?.trim() || 'Accra',
        country: payload.country?.trim() || 'Ghana',
        verified: payload.verified ?? true
      }
    ]);

    if (error) throw error;

    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id: admin.id,
      action_type: 'INSTITUTION_CREATED',
      target_type: 'institution',
      details: payload
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create institution' };
  }
}

export async function toggleVerifyInstitutionAction(
  id: string,
  verified: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();
    const supabaseAdmin = getAdminClient();

    const { error } = await supabaseAdmin
      .from('institutions')
      .update({ verified })
      .eq('id', id);

    if (error) throw error;

    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id: admin.id,
      action_type: 'INSTITUTION_VERIFICATION_TOGGLED',
      target_id: id,
      target_type: 'institution',
      details: { verified }
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function runAutoAssociateDomainAction(
  domain: string,
  institutionId: string
): Promise<{ success: boolean; matchedCount: number; error?: string }> {
  try {
    const admin = await requireAdmin();
    const supabaseAdmin = getAdminClient();

    const cleanDomain = domain.trim().toLowerCase();
    if (!cleanDomain) return { success: false, matchedCount: 0, error: 'Invalid domain' };

    // Find students whose email ends with domain (e.g. %upsamail.edu.gh)
    const { data: matchedProfiles, error: fetchErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .ilike('email', `%${cleanDomain}`);

    if (fetchErr) throw fetchErr;

    if (!matchedProfiles || matchedProfiles.length === 0) {
      return { success: true, matchedCount: 0 };
    }

    const matchedIds = matchedProfiles.map((p) => p.id);
    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({ institution_id: institutionId })
      .in('id', matchedIds);

    if (updateErr) throw updateErr;

    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id: admin.id,
      action_type: 'STUDENTS_AUTO_ASSOCIATED_DOMAIN',
      target_id: institutionId,
      target_type: 'institution',
      details: { domain: cleanDomain, matchedCount: matchedIds.length }
    });

    return { success: true, matchedCount: matchedIds.length };
  } catch (err: any) {
    return { success: false, matchedCount: 0, error: err.message };
  }
}

export async function deleteInstitutionAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();
    const supabaseAdmin = getAdminClient();

    const { error } = await supabaseAdmin.from('institutions').delete().eq('id', id);
    if (error) throw error;

    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id: admin.id,
      action_type: 'INSTITUTION_DELETED',
      target_id: id,
      target_type: 'institution'
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

