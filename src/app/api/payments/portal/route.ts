import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/payments/stripe'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!customer?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000'

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: `${origin}/dashboard/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe portal error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    )
  }
}
