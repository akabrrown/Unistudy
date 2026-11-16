import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return user
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const supabase = await createClient()
    const user = await checkAdmin(supabase)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { title, body, type, target, target_audience } = await req.json()

    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
    }

    const resolvedParams = await Promise.resolve(params);
    const resolvedTarget = target || target_audience || 'all'
    const resolvedType = type || 'banner'

    const { data, error } = await supabase
      .from('announcements')
      .update({
        title: title.trim(),
        body: body.trim(),
        type: resolvedType,
        target: resolvedTarget
      })
      .eq('id', resolvedParams.id)
      .select()
      .single()

    if (error) throw error

    // Log to admin_audit_logs
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action_type: 'update_announcement',
        target_id: data.id,
        target_type: 'announcement',
        details: {
          title: data.title,
          type: data.type,
          target: data.target
        }
      })
    } catch (auditErr) {
      console.warn('Failed to write admin audit log for announcement update:', auditErr)
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const supabase = await createClient()
    const user = await checkAdmin(supabase)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const resolvedParams = await Promise.resolve(params);

    // Get announcement details before deleting for audit trail
    const { data: existing } = await supabase
      .from('announcements')
      .select('id, title, type, target')
      .eq('id', resolvedParams.id)
      .single()

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', resolvedParams.id)

    if (error) throw error

    // Log to admin_audit_logs
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action_type: 'delete_announcement',
        target_id: resolvedParams.id,
        target_type: 'announcement',
        details: {
          title: existing?.title || 'Unknown',
          type: existing?.type || 'banner',
          target: existing?.target || 'all'
        }
      })
    } catch (auditErr) {
      console.warn('Failed to write admin audit log for announcement delete:', auditErr)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
