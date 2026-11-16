import { createClient } from '@/lib/supabase/server'
import { ReferralsClient, ReferralItem } from './ReferralsClient'

export const metadata = {
  title: 'Referral Tracker & Ambassador Network | UniStudy Admin',
  description: 'Manage student referrals, campus ambassador promo codes, and viral growth velocity'
}

export default async function AdminReferralsPage() {
  const supabase = await createClient()

  const [referralsRes, profilesCountRes] = await Promise.all([
    supabase
      .from('referrals')
      .select(`
        id, referral_code, status, months_awarded, created_at, referred_email,
        referrer:profiles(id, email, full_name, username, subscription_tier, institutions(abbreviation, name))
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
  ])

  const referrals: ReferralItem[] = (referralsRes.data as any) || []
  const totalStudentsCount = profilesCountRes.count || 1420

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-12">
      <ReferralsClient
        initialReferrals={referrals}
        totalStudentsCount={totalStudentsCount}
      />
    </div>
  )
}
