import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/security/adminGuard';

export async function POST(req: NextRequest) {
  const { error, userId: adminId } = await requireAdminApi();
  if (error) return error;

  try {
    const { userId, reason } = await req.json();
    const supabase = supabaseServer();

    // Suspend the user
    await supabase.from('profiles')
      .update({ role: 'suspended' })
      .eq('id', userId);

    // Log the action in audit_logs
    await supabase.from('audit_logs').insert({
      admin_id: adminId,
      action: 'USER_SUSPENDED',
      target_user_id: userId,
      details: { reason }
    });

    // In a real app we'd trigger an email to the user via Resend here
    // await resend.emails.send({...})

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
