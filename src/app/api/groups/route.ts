import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { z } from 'zod';

const CreateGroupSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().max(200).optional(),
});

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const supabase = supabaseServer();
    
    // Fetch groups the user is a member of
    const { data: members, error: memberErr } = await supabase
      .from('study_group_members')
      .select('group_id, role, study_groups(id, name, description, created_at, created_by)')
      .eq('user_id', userId!);

    if (memberErr) throw memberErr;

    const groups = members?.map((m: any) => ({
      ...m.study_groups,
      userRole: m.role
    })) || [];

    return NextResponse.json({ groups });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    
    // Check if it's a join request or create request
    if (body.action === 'join') {
      const { groupId } = body;
      if (!groupId) return NextResponse.json({ error: 'Group ID required' }, { status: 400 });

      const supabase = supabaseServer();
      const { error: joinErr } = await supabase
        .from('study_group_members')
        .insert({ group_id: groupId, user_id: userId, role: 'member' });

      if (joinErr) {
        if (joinErr.code === '23505') { // Unique violation
          return NextResponse.json({ error: 'Already a member' }, { status: 400 });
        }
        throw joinErr;
      }
      return NextResponse.json({ success: true });
    }

    // Otherwise, create group
    const { name, description } = CreateGroupSchema.parse(body);
    const supabase = supabaseServer();

    // 1. Create the group
    const { data: newGroup, error: createErr } = await supabase
      .from('study_groups')
      .insert({ name, description, created_by: userId })
      .select()
      .single();

    if (createErr) throw createErr;

    // 2. Add the creator as an admin member
    const { error: memberErr } = await supabase
      .from('study_group_members')
      .insert({ group_id: newGroup.id, user_id: userId, role: 'admin' });

    if (memberErr) throw memberErr;

    return NextResponse.json({ group: { ...newGroup, userRole: 'admin' } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process request' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const url = new URL(req.url);
    const groupId = url.searchParams.get('id');
    const action = url.searchParams.get('action'); // 'leave' or 'delete'

    if (!groupId) return NextResponse.json({ error: 'Group ID missing' }, { status: 400 });

    const supabase = supabaseServer();

    if (action === 'leave') {
      const { error: leaveErr } = await supabase
        .from('study_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId!);
      
      if (leaveErr) throw leaveErr;
    } else {
      // Delete the entire group (only creator can do this due to RLS)
      const { error: delErr } = await supabase
        .from('study_groups')
        .delete()
        .eq('id', groupId)
        .eq('created_by', userId!);
        
      if (delErr) throw delErr;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
