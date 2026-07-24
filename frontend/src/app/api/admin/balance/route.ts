import { requireAdmin } from '@/lib/security/adminGuard'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    // 1. Get platform balance
    const { data: balanceData, error: balanceError } = await supabase
      .from('platform_ai_balance')
      .select('*')
      .eq('provider', 'gemini')
      .single()

    if (balanceError && balanceError.code !== 'PGRST116') {
      throw balanceError
    }

    // 2. Get global settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('platform_settings')
      .select('*')
      .single()

    if (settingsError && settingsError.code !== 'PGRST116') {
      throw settingsError
    }

    // 3. User distribution stats (simplified for now)
    const { count: freeUsers } = await supabase
      .from('user_quota')
      .select('user_id', { count: 'exact', head: true })
      .eq('plan', 'free')

    const { count: paidUsers } = await supabase
      .from('user_quota')
      .select('user_id', { count: 'exact', head: true })
      .eq('plan', 'paid')

    // Today's consumption (mock calculation or from ai_request_log)
    // For now we just return the raw balance and settings
    
    return NextResponse.json({
      balance: balanceData || {
        provider: 'gemini',
        total_purchased: 50000,
        total_consumed: 0,
        remaining: 50000,
        pct_remaining: 100,
        is_suspended: false,
        last_topped_up_at: new Date().toISOString()
      },
      settings: settingsData || {
        free_daily_limit: 50,
        paid_monthly_limit: 200
      },
      user_breakdown: {
        free_users: freeUsers || 0,
        paid_users: paidUsers || 0,
      }
    })
  } catch (err: any) {
    console.error('Error fetching admin balance:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Top Up Action & Settings Update
export async function POST(request: Request) {
  try {
    await requireAdmin()
    const supabase = await createClient()
    const body = await request.json()

    if (body.action === 'topup') {
      const { amount, cost_ghs, notes } = body
      if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

      const { error } = await supabase.rpc('topup_platform_balance', {
        p_provider: 'gemini',
        p_amount: amount,
        p_cost_ghs: cost_ghs || null,
        p_notes: notes || null
      })

      if (error) throw error

      return NextResponse.json({ success: true, message: `Successfully topped up ${amount} requests` })
    }

    if (body.action === 'update_settings') {
      const { free_daily_limit, paid_monthly_limit } = body

      // Get current settings ID
      const { data: settings } = await supabase.from('platform_settings').select('id').single()

      if (settings) {
        const { error } = await supabase
          .from('platform_settings')
          .update({
            free_daily_limit,
            paid_monthly_limit,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('platform_settings')
          .insert({
            free_daily_limit,
            paid_monthly_limit
          })
        if (error) throw error
      }

      // Also update existing user_quota limits to match new defaults
      // (This affects all users immediately)
      await supabase.from('user_quota').update({ daily_limit: free_daily_limit }).eq('plan', 'free')
      await supabase.from('user_quota').update({ monthly_limit: paid_monthly_limit }).eq('plan', 'paid')

      return NextResponse.json({ success: true, message: 'Settings updated successfully' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    console.error('Error processing admin action:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
