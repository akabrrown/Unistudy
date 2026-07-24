import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const supabase = await createClient();
    
    // Check membership and fetch group details
    const { data: memberData, error: memberErr } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId!)
      .single();

    // Fetch the group itself
    const { data: groupData, error: groupErr } = await supabase
      .from('study_groups')
      .select('*, courses(title)')
      .eq('id', groupId)
      .single();

    if (groupErr) throw groupErr;

    // Fetch members
    const { data: members, error: membersErr } = await supabase
      .from('study_group_members')
      .select('role, user_id, joined_at, profiles(id, full_name, avatar_url)')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (membersErr) throw membersErr;

    // Check if the user is allowed to see the details
    const isMember = !!memberData;
    const canView = isMember || !groupData.is_private;

    if (!canView) {
      return NextResponse.json({ error: 'Private group' }, { status: 403 });
    }

    // Fetch materials shared with this group for the current user
    const { data: materialsData } = await supabase
      .from('material_access')
      .select('shared_materials(*, profiles(full_name))')
      .eq('group_id', groupId)
      .eq('recipient_id', userId!);

    const materials = materialsData 
      ? materialsData.map((m: any) => m.shared_materials).filter(Boolean)
      : [];

    return NextResponse.json({ 
      group: groupData, 
      members: members?.map((m: any) => ({
        id: m.profiles.id,
        name: m.profiles.full_name,
        avatar_url: m.profiles.avatar_url,
        role: m.role,
        joined_at: m.joined_at
      })) || [],
      materials,
      isMember,
      userRole: memberData?.role
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
  is_private: z.boolean().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = UpdateGroupSchema.parse(body);

    const supabase = await createClient();
    
    const { data: updatedGroup, error: updateErr } = await supabase
      .from('study_groups')
      .update(parsed)
      .eq('id', groupId)
      .select('*, courses(title)')
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ group: updatedGroup });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
