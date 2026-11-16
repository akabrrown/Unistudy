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

export async function overrideSubscriptionPlanAction(data: {
  userId: string
  newPlan: 'free' | 'pro' | 'ultra' | 'enterprise'
  expiryDays?: number
  reason?: string
}) {
  try {
    const supabase = await createClient()
    const adminUser = await checkAdmin(supabase)
    if (!adminUser) return { success: false, error: 'Unauthorized: Admin role required' }

    if (!data.userId) return { success: false, error: 'User ID is required' }

    const expiry = new Date()
    expiry.setDate(expiry.getDate() + (data.expiryDays || 30))

    // 1. Update profile plan
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ plan: data.newPlan })
      .eq('id', data.userId)

    if (profileError) throw profileError

    // 2. Best-effort update or insert in subscriptions table
    try {
      await supabase.from('subscriptions').upsert({
        user_id: data.userId,
        plan: data.newPlan,
        plan_id: data.newPlan,
        status: data.newPlan === 'free' ? 'canceled' : 'active',
        current_period_end: data.newPlan === 'free' ? null : expiry.toISOString()
      }, { onConflict: 'user_id' })
    } catch (subErr) {
      console.warn('[overrideSubscriptionPlanAction] subscriptions table upsert skipped:', subErr)
    }

    // 3. Log audit event
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: adminUser.id,
        action_type: 'subscription_override',
        target_id: data.userId,
        target_type: 'subscription',
        details: {
          newPlan: data.newPlan,
          expiryDays: data.expiryDays || 30,
          reason: data.reason || 'Admin manual override',
          overriddenAt: new Date().toISOString()
        }
      })
    } catch (auditErr) {
      console.warn('[overrideSubscriptionPlanAction] audit log insert skipped:', auditErr)
    }

    revalidatePath('/admin/subscriptions')
    revalidatePath('/admin/users')
    return { success: true }
  } catch (err: any) {
    console.error('overrideSubscriptionPlanAction error:', err)
    return { success: false, error: err.message || 'Failed to override plan' }
  }
}

export async function grantRewardMonthAction(data: {
  userId: string
  reason?: string
}) {
  try {
    const supabase = await createClient()
    const adminUser = await checkAdmin(supabase)
    if (!adminUser) return { success: false, error: 'Unauthorized: Admin role required' }

    if (!data.userId) return { success: false, error: 'User ID is required' }

    // Check existing profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', data.userId)
      .single()

    const currentPlan = profile?.plan === 'free' || !profile?.plan ? 'pro' : profile.plan

    // Fetch existing subscription if any
    let existingEnd: Date | null = null
    try {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('current_period_end')
        .eq('user_id', data.userId)
        .maybeSingle()
      if (sub?.current_period_end) {
        const d = new Date(sub.current_period_end)
        if (d > new Date()) existingEnd = d
      }
    } catch {
      // Subscriptions table might not be queried
    }

    const newExpiry = existingEnd ? new Date(existingEnd.getTime() + 30 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // Update profile
    await supabase
      .from('profiles')
      .update({ plan: currentPlan })
      .eq('id', data.userId)

    // Update subscriptions
    try {
      await supabase.from('subscriptions').upsert({
        user_id: data.userId,
        plan: currentPlan,
        plan_id: currentPlan,
        status: 'active',
        current_period_end: newExpiry.toISOString()
      }, { onConflict: 'user_id' })
    } catch (subErr) {
      console.warn('[grantRewardMonthAction] subscriptions upsert skipped:', subErr)
    }

    // Log audit
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: adminUser.id,
        action_type: 'grant_reward_month',
        target_id: data.userId,
        target_type: 'subscription',
        details: {
          plan: currentPlan,
          extendedUntil: newExpiry.toISOString(),
          reason: data.reason || 'Admin reward month grant',
          grantedAt: new Date().toISOString()
        }
      })
    } catch (auditErr) {
      console.warn('[grantRewardMonthAction] audit log insert skipped:', auditErr)
    }

    revalidatePath('/admin/subscriptions')
    return { success: true, newExpiry: newExpiry.toISOString() }
  } catch (err: any) {
    console.error('grantRewardMonthAction error:', err)
    return { success: false, error: err.message || 'Failed to grant reward month' }
  }
}

export async function cancelSubscriptionAction(data: {
  userId: string
  reason?: string
}) {
  try {
    const supabase = await createClient()
    const adminUser = await checkAdmin(supabase)
    if (!adminUser) return { success: false, error: 'Unauthorized: Admin role required' }

    if (!data.userId) return { success: false, error: 'User ID is required' }

    // Downgrade profile to free
    await supabase
      .from('profiles')
      .update({ plan: 'free' })
      .eq('id', data.userId)

    // Update subscription to canceled
    try {
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled', current_period_end: new Date().toISOString() })
        .eq('user_id', data.userId)
    } catch (subErr) {
      console.warn('[cancelSubscriptionAction] subscriptions update skipped:', subErr)
    }

    // Audit log
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: adminUser.id,
        action_type: 'subscription_cancelled',
        target_id: data.userId,
        target_type: 'subscription',
        details: {
          reason: data.reason || 'Admin cancellation',
          cancelledAt: new Date().toISOString()
        }
      })
    } catch (auditErr) {
      console.warn('[cancelSubscriptionAction] audit log insert skipped:', auditErr)
    }

    revalidatePath('/admin/subscriptions')
    revalidatePath('/admin/users')
    return { success: true }
  } catch (err: any) {
    console.error('cancelSubscriptionAction error:', err)
    return { success: false, error: err.message || 'Failed to cancel subscription' }
  }
}

export async function batchOverrideSubscriptionsAction(data: {
  userIds: string[]
  newPlan: 'free' | 'pro' | 'ultra' | 'enterprise'
  expiryDays?: number
  reason?: string
}) {
  try {
    const supabase = await createClient()
    const adminUser = await checkAdmin(supabase)
    if (!adminUser) return { success: false, error: 'Unauthorized: Admin role required' }

    if (!data.userIds?.length) return { success: false, error: 'Select at least one user' }

    const expiry = new Date()
    expiry.setDate(expiry.getDate() + (data.expiryDays || 30))

    // Update profiles
    const { error: batchErr } = await supabase
      .from('profiles')
      .update({ plan: data.newPlan })
      .in('id', data.userIds)

    if (batchErr) throw batchErr

    // Audit
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: adminUser.id,
        action_type: 'batch_subscription_override',
        target_type: 'subscription_batch',
        details: {
          count: data.userIds.length,
          userIds: data.userIds,
          newPlan: data.newPlan,
          reason: data.reason || 'Batch admin override',
          appliedAt: new Date().toISOString()
        }
      })
    } catch (auditErr) {
      console.warn('Batch audit log failed', auditErr)
    }

    revalidatePath('/admin/subscriptions')
    return { success: true, count: data.userIds.length }
  } catch (err: any) {
    console.error('batchOverrideSubscriptionsAction error:', err)
    return { success: false, error: err.message || 'Failed batch override' }
  }
}
