import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users as UsersIcon, ShieldAlert, ArrowUpRight } from 'lucide-react'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  // Get all users
  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">User Management</h1>
        <p className="text-muted-foreground">Search, manage, and suspend platform users.</p>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>A complete list of registered accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Plan</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{user.full_name || 'No Name'}</div>
                      <div className="text-muted-foreground text-xs">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${user.role === 'admin' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                          user.role === 'suspended' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}
                      `}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize text-muted-foreground">{user.plan || 'free'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-xs font-medium text-[var(--color-plum-600)] hover:underline inline-flex items-center gap-1 mr-3">
                        Edit <ArrowUpRight className="w-3 h-3" />
                      </button>
                      {user.role !== 'suspended' && user.role !== 'admin' && (
                        <button className="text-xs font-medium text-red-600 hover:underline inline-flex items-center gap-1">
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                
                {(!users || users.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
