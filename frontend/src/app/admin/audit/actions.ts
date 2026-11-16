'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return user
}

export async function recordAuditCheckpointAction(data: {
  actionType: string
  notes?: string
  targetType?: string
  targetId?: string
}) {
  try {
    const supabase = await createClient()
    const user = await checkAdmin(supabase)
    if (!user) return { success: false, error: 'Unauthorized: Admin role required' }

    if (!data.actionType?.trim()) {
      return { success: false, error: 'Action type is required' }
    }

    const { data: inserted, error } = await supabase
      .from('admin_audit_logs')
      .insert({
        admin_id: user.id,
        action_type: data.actionType.trim().toUpperCase(),
        target_type: data.targetType || 'compliance_checkpoint',
        target_id: data.targetId || null,
        details: {
          notes: data.notes?.trim() || 'Manual security compliance checkpoint recorded by administrator',
          timestamp: new Date().toISOString(),
          actor_email: user.email
        }
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/audit')
    return { success: true, data: inserted }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to record audit checkpoint' }
  }
}
