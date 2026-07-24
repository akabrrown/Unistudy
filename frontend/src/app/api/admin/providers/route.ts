import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/security/adminGuard'
import { getAllProviderStatuses, getProviderStatus } from '@/lib/ai/balance'

export async function GET() {
  try {
    await requireAdmin()
    
    const statuses = await getAllProviderStatuses()
    
    // We would map and augment these statuses with real-time projections
    // For now we return the database row state plus the percentage logic from balance.ts
    const enhancedStatuses = await Promise.all(
      statuses.map(s => getProviderStatus(s.provider as any))
    )

    return NextResponse.json({ providers: enhancedStatuses })
  } catch (err: any) {
    console.error('Admin Providers Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin()
    const { action, provider, value } = await req.json()
    const supabase = await createClient()

    if (action === 'set_disabled') {
      await supabase.from('platform_ai_balance').update({ is_disabled: value }).eq('provider', provider)
      return NextResponse.json({ success: true })
    }
    
    if (action === 'set_fallback_active') {
      await supabase.from('platform_ai_balance').update({ is_fallback_active: value }).eq('provider', provider)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
