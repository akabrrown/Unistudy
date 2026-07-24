import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // We can extract unique email domains from institutional emails if a direct domain table doesn't exist
  // or return a hardcoded list of verified domains for now
  
  const domains = [
    'upsamail.edu.gh',
    'st.ug.edu.gh',
    'knust.edu.gh',
    'ucc.edu.gh',
    'ashesi.edu.gh',
    'gimpa.edu.gh'
  ];

  return NextResponse.json({ domains });
}
