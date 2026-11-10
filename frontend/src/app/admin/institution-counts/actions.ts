'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/security/adminGuard';

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
    // 1. Guard server action so only verified admins can invoke
    await requireAdmin();

    // 2. Use admin service role client to aggregate platform-wide counts safely without RLS truncation
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [institutionsRes, profilesRes] = await Promise.all([
      supabaseAdmin
        .from('institutions')
        .select('id, name, abbreviation, type, domain, verified')
        .order('name'),
      supabaseAdmin
        .from('profiles')
        .select('institution_id, university')
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

    const data: InstitutionWithCount[] = (institutionsRes.data || []).map((inst) => {
      const byId = countsById.get(inst.id) || 0;
      const byName = inst.name ? (countsByName.get(inst.name.toLowerCase().trim()) || 0) : 0;
      const byAbbr = inst.abbreviation ? (countsByName.get(inst.abbreviation.toLowerCase().trim()) || 0) : 0;
      
      // Compute best matched student count
      const studentCount = Math.max(byId, byName, byAbbr);

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

