import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { shareId } = await req.json()

    if (!shareId) {
      return NextResponse.json({ error: 'Missing shareId' }, { status: 400 })
    }

    // Verify the user has access to the shared material
    const { data: sharedMaterial, error: fetchError } = await supabase
      .from('shared_materials')
      .select('*')
      .eq('id', shareId)
      .single()

    if (fetchError || !sharedMaterial) {
      return NextResponse.json({ error: 'Material not found or access denied' }, { status: 404 })
    }

    // Upsert into material_access indicating it's saved
    const { error: upsertError } = await supabase
      .from('material_access')
      .upsert({
        share_id: shareId,
        recipient_id: user.id,
        saved: true,
        accessed_at: new Date().toISOString()
      }, { onConflict: 'share_id, recipient_id' })

    if (upsertError) {
      console.error('Failed to save material:', upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Save material error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
