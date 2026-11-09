import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { CREDIT_BUNDLES } from '../../../../../../shared/constants/quota'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Paystack sends webhooks from their servers, so we must use Service Role key to bypass RLS
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-paystack-signature')
    const secretKey = process.env.PAYSTACK_SECRET_KEY

    if (!secretKey) {
      console.error('PAYSTACK_SECRET_KEY is not configured on the server')
      return NextResponse.json({ error: 'Webhook configuration error' }, { status: 500 })
    }

    // Verify webhook signature with constant-time equality check to prevent timing attacks
    const hash = crypto.createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex')
    
    if (
      !signature ||
      typeof signature !== 'string' ||
      hash.length !== signature.length ||
      !crypto.timingSafeEqual(Buffer.from(hash, 'utf-8'), Buffer.from(signature, 'utf-8'))
    ) {
      console.warn('Invalid Paystack webhook signature rejected')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(rawBody)

    if (event.event === 'charge.success') {
      const data = event.data
      const metadata = data?.metadata

      if (metadata?.type === 'credit_topup') {
        const userId = metadata.user_id || metadata.userId
        const bundleId = metadata.bundle_id || metadata.bundleId
        const paidAmountPesewas = Number(data?.amount || 0) // Paystack amounts are in pesewas / kobo

        if (!userId) {
          console.error('Paystack webhook missing userId in metadata')
          return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
        }

        // Canonical server-side price check
        // Find bundle either by bundleId or find the exact bundle that corresponds to this price
        let bundle = bundleId ? CREDIT_BUNDLES[bundleId] : null
        if (!bundle) {
          bundle = Object.values(CREDIT_BUNDLES).find(b => b.price * 100 === paidAmountPesewas) || null
        }

        if (!bundle) {
          console.error(`Rejected unauthorized topup: unrecognized bundle or paid amount (${paidAmountPesewas} pesewas)`)
          return NextResponse.json({ error: 'Invalid or unrecognized bundle price' }, { status: 400 })
        }

        const expectedPesewas = bundle.price * 100
        if (paidAmountPesewas < expectedPesewas) {
          console.error(`SECURITY ALERT: Price underpayment detected! Expected ${expectedPesewas} pesewas, received ${paidAmountPesewas}`)
          return NextResponse.json({ error: 'Amount paid does not cover bundle price' }, { status: 400 })
        }

        // Canonical credits granted ONLY from verified server bundle definition
        const creditsToGrant = bundle.credits

        // Atomic wallet credit increment
        const { error: rpcError } = await adminSupabase.rpc('increment_credit_wallet', {
          p_user_id: userId,
          p_amount: creditsToGrant
        })

        if (rpcError) {
          console.error('Failed to increment credit wallet via RPC:', rpcError)
          return NextResponse.json({ error: 'Wallet update failed' }, { status: 500 })
        }

        console.log(`Successfully credited ${creditsToGrant} AI credits to user ${userId} for transaction ${data.reference}`)

        // Audit log
        await adminSupabase.from('ai_request_log').insert({
          user_id: userId,
          provider: 'system',
          feature: 'credit_purchase',
          pool_type: 'credit_funded',
          requests_cost: -creditsToGrant,
          was_cached: false,
          drew_from_pool: false,
          user_plan: 'credit_system'
        })

        // Confirmation Email
        if (resend && data.customer?.email) {
          await resend.emails.send({
            from: 'UniStudy AI <billing@unistudy.ai>',
            to: [data.customer.email],
            subject: 'Credit Top-Up Successful — UniStudy AI',
            text: `Thank you for your purchase! We've successfully topped up your wallet with ${creditsToGrant.toLocaleString()} AI credits. Reference: ${data.reference}`
          }).catch(mailErr => console.error('Failed to send confirmation email:', mailErr))
        }
      }
    }

    return NextResponse.json({ received: true })

  } catch (err) {
    console.error('Paystack webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
