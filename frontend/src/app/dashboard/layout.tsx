import { createClient, getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createClient()
  const { data: rawProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, avatar_url, full_name, username, plan, faculty, degree_programme, year_of_study, institutions(abbreviation, name)')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.warn('[DashboardLayout] Profile fetch notice:', profileError.message)
  }

  const userFullName = rawProfile?.full_name || (user?.user_metadata?.full_name as string) || (user?.user_metadata?.name as string) || null
  const userEmailName = user?.email ? user.email.split('@')[0] : 'UPSA Scholar'
  const userDisplayName = userFullName || rawProfile?.username || userEmailName

  const resolvedInstitutions =
    (Array.isArray(rawProfile?.institutions) ? rawProfile.institutions[0] : rawProfile?.institutions) || {
      abbreviation: 'UPSA',
      name: 'University of Professional Studies, Accra',
    }

  const profile = {
    id: user.id,
    role: rawProfile?.role || 'student',
    avatar_url: rawProfile?.avatar_url || (user?.user_metadata?.avatar_url as string) || null,
    full_name: userDisplayName,
    username: rawProfile?.username || userDisplayName,
    subscription_tier: rawProfile?.plan || 'free',
    faculty: rawProfile?.faculty || null,
    degree_programme: rawProfile?.degree_programme || null,
    year_of_study: rawProfile?.year_of_study || null,
    institutions: resolvedInstitutions,
  }

  // Fetch the single most recent announcement targeted to all or matching student's tier/faculty/level
  const userTier = profile?.subscription_tier === 'pro' || profile?.subscription_tier === 'ultra' ? 'tier:pro' : 'tier:free'
  const userFaculty = profile?.faculty ? `faculty:${profile.faculty}` : null
  const userLevel = profile?.year_of_study ? `level:${profile.year_of_study}` : null
  const allowedTargets = ['all', userTier]
  if (userFaculty) allowedTargets.push(userFaculty)
  if (userLevel) allowedTargets.push(userLevel)

  const { data: latestAnnouncement } = await supabase
    .from('announcements')
    .select('id, title, body')
    .in('target', allowedTargets)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Retrieve credit wallet balance with guaranteed 20 Welcome Bonus credits
  let initialWalletBalance = 20
  try {
    const { data: walletData } = await supabase
      .from('credit_wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle()

    if (walletData && typeof walletData.balance === 'number') {
      initialWalletBalance = walletData.balance
    } else {
      // First time user: initialize with guaranteed 20 welcome bonus credits
      const { getAdminClient } = await import('@/lib/supabase/admin')
      const admin = getAdminClient()
      await (admin.from('credit_wallets') as any).upsert({
        user_id: user.id,
        balance: 20,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      initialWalletBalance = 20
    }
  } catch (err) {
    console.warn('[DashboardLayout] Wallet check notice:', err)
    initialWalletBalance = 20
  }

  return (
    <DashboardShell profile={profile} latestAnnouncement={latestAnnouncement} initialWalletBalance={initialWalletBalance}>
      {children}
    </DashboardShell>
  )
}

