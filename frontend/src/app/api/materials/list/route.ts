import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') || 'shared-with-me'

  try {
    let query = supabase
      .from('shared_materials')
      .select(`
        *,
        profiles:owner_id(full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (filter === 'i-shared') {
      // Items I created and shared
      query = query.eq('owner_id', user.id)
    } else {
      // Items shared with me (RLS automatically filters out what I shouldn't see)
      // We exclude items I own
      query = query.neq('owner_id', user.id)
    }

    const { data: materials, error } = await query

    if (error) {
      console.error('Failed to fetch materials:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Optionally attach saved status from material_access
    let savedMaterials = []
    if (filter === 'shared-with-me' && materials && materials.length > 0) {
      const { data: accessData } = await supabase
        .from('material_access')
        .select('share_id, saved')
        .eq('recipient_id', user.id)
      
      const savedMap = new Map(accessData?.map(a => [a.share_id, a.saved]))
      
      savedMaterials = materials.map(m => ({
        ...m,
        saved: savedMap.get(m.id) || false
      }))
    } else {
      savedMaterials = materials || []
    }

    return NextResponse.json({ materials: savedMaterials })
  } catch (error: any) {
    console.error('List materials error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
