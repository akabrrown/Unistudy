import { createClient } from '@/lib/supabase/server'
import SubscriptionsClient, { SubscriberItem, PaymentLogItem } from './SubscriptionsClient'

export const metadata = {
  title: 'Subscriptions & Revenue Command | UniStudy Admin',
  description: 'Manage recurring subscription plans, Paystack transactions, and manual overrides'
}

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient()

  // 1. Fetch profiles on paid plans or all profiles
  const [
    paidProfilesRes,
    totalProfilesRes,
    subscriptionsRes,
    institutionsRes,
    paymentsRes
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, plan, role, university, created_at, institutions:institution_id(id, name, abbreviation)')
      .neq('plan', 'free')
      .order('created_at', { ascending: false })
      .then(r => r, () => ({ data: [] })),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .then(r => r, () => ({ count: 0 })),
    supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .then(r => r, () => ({ data: [] })),
    supabase
      .from('institutions')
      .select('id, name, abbreviation')
      .order('name')
      .then(r => r, () => ({ data: [] })),
    supabase
      .from('payment_transactions')
      .select('id, user_id, amount, reference, status, created_at, profiles(email, full_name)')
      .order('created_at', { ascending: false })
      .limit(60)
      .then(r => r, () => ({ data: [] }))
  ])

  const paidProfiles = (paidProfilesRes as any)?.data || []
  const totalUserCount = (totalProfilesRes as any)?.count || paidProfiles.length || 100
  const rawSubs = (subscriptionsRes as any)?.data || []
  const institutions = (institutionsRes as any)?.data || []
  const rawPayments = (paymentsRes as any)?.data || []

  // Index subscriptions by user_id
  const subMap = new Map<string, any>()
  rawSubs.forEach((s: any) => subMap.set(s.user_id, s))

  // Build merged subscriber list
  const subscriberItems: SubscriberItem[] = paidProfiles.map((p: any) => {
    const sub = subMap.get(p.id)
    return {
      id: sub?.id || `sub_${p.id.slice(0, 8)}`,
      user_id: p.id,
      plan_id: p.plan || sub?.plan || sub?.plan_id || 'pro',
      status: sub?.status || 'active',
      created_at: sub?.created_at || p.created_at,
      current_period_end: sub?.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      profiles: {
        email: p.email,
        full_name: p.full_name,
        university: p.university,
        institution: (p.institutions as any)?.abbreviation || (p.institutions as any)?.name
      }
    }
  })

  // Format payment log items
  const paymentLogItems: PaymentLogItem[] = rawPayments.map((t: any) => ({
    id: t.id,
    user_id: t.user_id,
    event_type: 'charge.success',
    amount: t.amount || 0,
    reference: t.reference || `REF-${t.id.slice(0, 8)}`,
    status: t.status || 'success',
    created_at: t.created_at || new Date().toISOString(),
    profiles: t.profiles
  }))

  return (
    <div className="space-y-6 max-w-[1550px] mx-auto pb-12">
      <SubscriptionsClient
        initialSubscriptions={subscriberItems}
        initialPaymentLogs={paymentLogItems}
        totalUserCount={totalUserCount}
        institutions={institutions}
      />
    </div>
  )
}
