import { requireAdmin } from '@/lib/security/adminGuard';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminSidebarNav } from '@/components/admin/AdminSidebarNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  async function handleAdminSignOut() {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/');
  }

  return (
    <AdminSidebarNav userEmail={user.email || ''} signOutAction={handleAdminSignOut}>
      {children}
    </AdminSidebarNav>
  );
}
