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

export async function createReferralAction(data: {
  referrerEmail?: string
  referralCode: string
  referredEmail: string
  status?: string
  monthsAwarded?: number
}) {
  try {
    const supabase = await createClient()
    const user = await checkAdmin(supabase)
    if (!user) return { success: false, error: 'Unauthorized: Admin role required' }

    if (!data.referralCode?.trim() || !data.referredEmail?.trim()) {
      return { success: false, error: 'Referral code and referred email are required' }
    }

    let referrerId: string | null = null
    if (data.referrerEmail?.trim()) {
      const { data: referrerUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', data.referrerEmail.trim())
        .maybeSingle()
      if (referrerUser) {
        referrerId = referrerUser.id
      }
    }

    const { data: inserted, error } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referral_code: data.referralCode.trim().toUpperCase(),
        referred_email: data.referredEmail.trim().toLowerCase(),
        status: data.status || 'pending',
        months_awarded: data.monthsAwarded || 0
      })
      .select()
      .single()

    if (error) throw error

    // Log to admin_audit_logs
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action_type: 'create_referral',
        target_id: inserted.id,
        target_type: 'referral',
        details: {
          code: inserted.referral_code,
          referred_email: inserted.referred_email,
          referrer_id: referrerId
        }
      })
    } catch (auditErr) {
      console.warn('Audit log error on referral creation:', auditErr)
    }

    revalidatePath('/admin/referrals')
    return { success: true, data: inserted }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create referral' }
  }
}

export async function updateReferralStatusAction(id: string, status: string, monthsAwarded?: number) {
  try {
    const supabase = await createClient()
    const user = await checkAdmin(supabase)
    if (!user) return { success: false, error: 'Unauthorized: Admin role required' }

    const updatePayload: Record<string, any> = { status }
    if (typeof monthsAwarded === 'number') {
      updatePayload.months_awarded = monthsAwarded
    }

    const { data: updated, error } = await supabase
      .from('referrals')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Log to admin_audit_logs
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action_type: 'update_referral_status',
        target_id: id,
        target_type: 'referral',
        details: { status, months_awarded: monthsAwarded }
      })
    } catch (auditErr) {
      console.warn('Audit log error on referral update:', auditErr)
    }

    revalidatePath('/admin/referrals')
    return { success: true, data: updated }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update referral status' }
  }
}

export async function grantRewardMonthAction(id: string) {
  try {
    const supabase = await createClient()
    const user = await checkAdmin(supabase)
    if (!user) return { success: false, error: 'Unauthorized: Admin role required' }

    // Fetch existing record
    const { data: existing, error: fetchErr } = await supabase
      .from('referrals')
      .select('id, months_awarded, status, referrer_id, referral_code')
      .eq('id', id)
      .single()

    if (fetchErr || !existing) return { success: false, error: 'Referral record not found' }

    const newMonths = (existing.months_awarded || 0) + 1

    const { data: updated, error } = await supabase
      .from('referrals')
      .update({
        months_awarded: newMonths,
        status: 'rewarded'
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // If referrer exists, grant them +1 month or pro plan upgrade
    if (existing.referrer_id) {
      try {
        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'pro'
          })
          .eq('id', existing.referrer_id)
      } catch (profErr) {
        console.warn('Non-fatal error updating referrer profile:', profErr)
      }
    }

    // Log to audit logs
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action_type: 'grant_referral_reward',
        target_id: id,
        target_type: 'referral',
        details: {
          code: existing.referral_code,
          previous_months: existing.months_awarded,
          new_months: newMonths
        }
      })
    } catch (auditErr) {
      console.warn('Audit log error on grant reward:', auditErr)
    }

    revalidatePath('/admin/referrals')
    return { success: true, monthsAwarded: newMonths }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to grant reward month' }
  }
}

export async function deleteReferralAction(id: string) {
  try {
    const supabase = await createClient()
    const user = await checkAdmin(supabase)
    if (!user) return { success: false, error: 'Unauthorized: Admin role required' }

    const { data: existing } = await supabase
      .from('referrals')
      .select('referral_code, referred_email')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('referrals')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Log to admin_audit_logs
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action_type: 'delete_referral',
        target_id: id,
        target_type: 'referral',
        details: {
          code: existing?.referral_code,
          referred_email: existing?.referred_email
        }
      })
    } catch (auditErr) {
      console.warn('Audit log error on referral delete:', auditErr)
    }

    revalidatePath('/admin/referrals')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete referral' }
  }
}

export async function batchRewardReferralsAction(ids: string[]) {
  try {
    const supabase = await createClient()
    const user = await checkAdmin(supabase)
    if (!user) return { success: false, error: 'Unauthorized: Admin role required' }

    if (!ids.length) return { success: false, error: 'No referrals selected' }

    const { error } = await supabase
      .from('referrals')
      .update({
        status: 'rewarded',
        months_awarded: 1
      })
      .in('id', ids)

    if (error) throw error

    // Log to audit logs
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action_type: 'batch_reward_referrals',
        target_type: 'referral',
        details: { count: ids.length, ids }
      })
    } catch (auditErr) {
      console.warn('Audit log error on batch reward:', auditErr)
    }

    revalidatePath('/admin/referrals')
    return { success: true, count: ids.length }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to batch reward referrals' }
  }
}
