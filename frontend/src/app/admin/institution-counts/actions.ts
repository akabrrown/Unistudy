'use server';

import { createClient } from '@/lib/supabase/server';

export interface InstitutionWithCount {
  id: string;
  name: string;
  abbreviation: string | null;
  type: string | null;
  domain: string | null;
  verified: boolean;
  studentCount: number;
}

export async function fetchInstitutionCountsAction(): Promise<{ data: InstitutionWithCount[]; error?: string }> {
  try {
    const supabase = await createClient();

    const [institutionsRes, profilesRes] = await Promise.all([
      supabase
        .from('institutions')
        .select('id, name, abbreviation, type, domain, verified')
        .order('name'),
      supabase
        .from('profiles')
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
      }
    }

    const data: InstitutionWithCount[] = (institutionsRes.data || []).map((inst) => {
      const byId = countsById.get(inst.id) || 0;
      const byName = inst.name ? (countsByName.get(inst.name.toLowerCase().trim()) || 0) : 0;
      // Prefer ID match; if user entered name as institution_id, use that
      const studentCount = byId > 0 ? byId : byName;

      return {
        id: inst.id,
        name: inst.name,
        abbreviation: inst.abbreviation,
        type: inst.type,
        domain: inst.domain,
        verified: !!inst.verified,
        studentCount
      };
    });

    return { data };
  } catch (err: any) {
    console.error('fetchInstitutionCountsAction error:', err);
    return { data: [], error: err.message || 'Failed to fetch counts' };
  }
}

