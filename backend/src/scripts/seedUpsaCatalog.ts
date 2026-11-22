import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { UPSA_PROGRAMMES_CATALOG } from '../../../shared/constants/upsa';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

async function syncCatalog() {
  console.log('====================================================');
  console.log('       UPSA PROGRAMMES & CATALOG DATABASE SYNC       ');
  console.log('====================================================\n');

  // 1. Check current count in course_programmes
  const { count: initialCount } = await supabase.from('course_programmes').select('*', { count: 'exact', head: true });
  console.log(`[STATUS] Initial records in course_programmes: ${initialCount ?? 0}`);

  // 2. Clear out legacy records
  console.log('[ACTION] Clearing legacy non-UPSA records from course_programmes...');
  const { error: delErr } = await supabase.from('course_programmes').delete().neq('name', '___NEVER_MATCH___');
  if (delErr) {
    console.error('[ERROR] Failed to clear course_programmes:', delErr.message);
  } else {
    console.log('[PASS] Old course_programmes purged successfully.');
  }

  // 3. Transform and insert official UPSA Catalog
  console.log(`[ACTION] Inserting ${UPSA_PROGRAMMES_CATALOG.length} official UPSA programmes...`);
  const recordsToInsert = UPSA_PROGRAMMES_CATALOG.map((p) => {
    let field = 'Professional Studies';
    if (p.facultyCode === 'FAF') field = 'Accounting & Finance';
    else if (p.facultyCode === 'FMS') field = 'Management Studies';
    else if (p.facultyCode === 'FITCS') field = 'Information Technology & Communication';
    else if (p.facultyCode === 'LAW') field = 'Law';
    else if (p.facultyCode === 'GRAD') field = 'Graduate Studies';

    let level = 'Undergraduate';
    if (p.level === 'diploma') level = 'Diploma';
    else if (p.level === 'postgraduate') level = 'Postgraduate';
    else if (p.level === 'professional') level = 'Professional';

    return {
      name: p.name,
      field,
      level,
    };
  });

  // Batch insert into course_programmes
  const { data: inserted, error: insErr } = await supabase
    .from('course_programmes')
    .insert(recordsToInsert)
    .select('id, name');

  if (insErr) {
    console.error('[ERROR] Insert failed:', insErr.message);
  } else {
    console.log(`[PASS] Successfully inserted ${inserted?.length ?? 0} official UPSA programmes into database!`);
  }

  // 4. Verify count
  const { count: finalCount } = await supabase.from('course_programmes').select('*', { count: 'exact', head: true });
  console.log(`\n[COMPLETE] Verified active programmes in database: ${finalCount}`);
  console.log('====================================================\n');
}

syncCatalog().catch(console.error);
