'use client';

import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowUpRight, Loader2, Shield, KeyRound, Trash2, Ban, UserCheck, MessageSquare, BookOpen, Activity, Zap } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { toast } from 'sonner';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters and Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Details Sheet
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await apiFetch('/admin/users');
      const userList = Array.isArray(res) ? res : (res.users || []);
      setUsers(userList);
    } catch (err: any) {
      console.error("Failed to fetch admin users:", err);
      toast.error(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUserDetails = async (userId: string) => {
    setLoadingDetails(true);
    try {
      const details = await apiFetch(`/admin/users/${userId}/details`);
      setUserDetails(details);
    } catch (err) {
      toast.error("Failed to load user details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenUser = (user: any) => {
    setSelectedUser(user);
    setUserDetails(null);
    fetchUserDetails(user.id);
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setUpdating(true);
    try {
      await apiFetch(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
      });
      toast.success(`User role updated to ${newRole}`);
      await fetchUsers();
      if (selectedUser?.id === userId) setSelectedUser((prev: any) => ({ ...prev, role: newRole }));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePlan = async (userId: string, newPlan: string) => {
    setUpdating(true);
    try {
      await apiFetch(`/admin/users/${userId}/plan`, {
        method: 'PATCH',
        body: JSON.stringify({ plan: newPlan })
      });
      toast.success(`User plan updated to ${newPlan}`);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update plan');
    } finally {
      setUpdating(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    setUpdating(true);
    try {
      const res = await apiFetch(`/admin/users/${userId}/reset-password`, { method: 'POST' });
      if (res.recoveryLink) {
        navigator.clipboard.writeText(res.recoveryLink);
        toast.success('Password recovery link copied to clipboard!');
      } else {
        toast.success('Password recovery email sent');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user account? This cannot be undone.')) return;
    setUpdating(true);
    try {
      await apiFetch(`/admin/users/${userId}`, { method: 'DELETE' });
      toast.success('User account deleted');
      setSelectedUser(null);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setUpdating(false);
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    let result = users.filter((u) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' || u.role === roleFilter || (!u.role && roleFilter === 'student');
      
      const activeSub = Array.isArray(u.subscriptions) ? u.subscriptions.find((s: any) => s.status === 'active') : null;
      const currentPlan = activeSub ? activeSub.plan_id : (u.plan || 'free');
      const matchesPlan = planFilter === 'all' || currentPlan === planFilter;

      return matchesSearch && matchesRole && matchesPlan;
    });

    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'xp') return (b.total_xp || 0) - (a.total_xp || 0);
      return 0;
    });

    return result;
  }, [users, searchTerm, roleFilter, planFilter, sortBy]);

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">User Management</h1>
          <p className="text-muted-foreground text-sm">Full control over every account on the platform.</p>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v || 'newest')}>
                  <SelectTrigger className="w-[140px] md:w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                  </SelectContent>
                </Select>

        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v || 'all')}>
          <SelectTrigger className="w-[140px] h-10">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>

        <Select value={planFilter} onValueChange={(v) => setPlanFilter(v || 'all')}>
          <SelectTrigger className="w-[140px] h-10">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="ultra">Ultra</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v || 'newest')}>
          <SelectTrigger className="w-[160px] h-10 ml-auto">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Join Date: Newest</SelectItem>
            <SelectItem value="oldest">Join Date: Oldest</SelectItem>
            <SelectItem value="xp">Total XP: Highest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-sm border-border">
        <div className="rounded-md overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border uppercase">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Plan</th>
                <th className="px-6 py-4 font-semibold">Institution</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
                <th className="px-6 py-4 font-semibold">XP</th>
                <th className="px-6 py-4 font-semibold text-right">Profile</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedUsers.map((user) => {
                const activeSub = Array.isArray(user.subscriptions) ? user.subscriptions.find((s: any) => s.status === 'active') : null;
                const planName = activeSub ? activeSub.plan_id : (user.plan || 'free');

                return (
                  <tr 
                    key={user.id} 
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => handleOpenUser(user)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{user.full_name || 'No Name'}</div>
                      <div className="text-muted-foreground text-xs">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.role === 'admin' ? 'default' : user.role === 'suspended' ? 'destructive' : 'secondary'} className="capitalize">
                        {user.role || 'student'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize text-muted-foreground font-medium">{planName}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {user.degree_programme || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-foreground font-medium">
                      {user.total_xp || 0}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {filteredAndSortedUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No users match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* User Profile View (Right-side Panel) */}
      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto bg-background p-0 border-l border-border flex flex-col">
          {selectedUser && (
            <>
              <div className="p-6 border-b border-border bg-muted/20">
                <SheetHeader>
                  <SheetTitle className="text-2xl">{selectedUser.full_name || 'Unnamed User'}</SheetTitle>
                  <SheetDescription>{selectedUser.email}</SheetDescription>
                </SheetHeader>
                <div className="flex gap-2 mt-4">
                  <Badge variant={selectedUser.role === 'admin' ? 'default' : selectedUser.role === 'suspended' ? 'destructive' : 'secondary'} className="capitalize px-3 py-1 text-sm">
                    {selectedUser.role || 'student'}
                  </Badge>
                  <Badge variant="outline" className="capitalize px-3 py-1 text-sm bg-background">
                    {selectedUser.plan || 'free'} Plan
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1 text-sm bg-background">
                    {selectedUser.total_xp || 0} XP
                  </Badge>
                </div>
              </div>

              <div className="p-6 flex-1 space-y-8">
                {/* AI Usage */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> AI Usage</h3>
                  {loadingDetails ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg bg-card shadow-sm">
                        <p className="text-sm text-muted-foreground mb-1">Today's Requests</p>
                        <p className="text-2xl font-bold">{userDetails?.aiUsage?.today || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-card shadow-sm">
                        <p className="text-sm text-muted-foreground mb-1">This Month</p>
                        <p className="text-2xl font-bold">{userDetails?.aiUsage?.month || 0}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Courses */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Enrolled Courses</h3>
                  {loadingDetails ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : userDetails?.courses?.length > 0 ? (
                    <div className="space-y-2">
                      {userDetails.courses.map((c: any) => (
                        <div key={c.id} className="text-sm p-3 border rounded-md bg-muted/10">
                          <span className="font-medium">{c.course_code}</span>: {c.title}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No courses found.</p>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Recent Platform Activity</h3>
                  {loadingDetails ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : userDetails?.recentActivity?.length > 0 ? (
                    <div className="space-y-3 border-l-2 border-primary/20 pl-4 ml-2">
                      {userDetails.recentActivity.map((log: any) => (
                        <div key={log.id} className="relative">
                          <div className="absolute -left-[23px] top-1.5 w-2 h-2 rounded-full bg-primary" />
                          <p className="text-sm font-medium capitalize">{log.action_type.replace(/_/g, ' ').toLowerCase()}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'PP p')}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No recent logged activity.</p>
                  )}
                </div>

                {/* Admin Actions */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <h3 className="font-semibold text-destructive">Admin Actions</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger 
                        className={cn(buttonVariants({ variant: 'outline' }), "w-full justify-start gap-2")} 
                        disabled={updating}
                      >
                        <Shield className="w-4 h-4" /> Change Role
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleUpdateRole(selectedUser.id, 'student')}>Make Student</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateRole(selectedUser.id, 'admin')}>Make Admin</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger 
                        className={cn(buttonVariants({ variant: 'outline' }), "w-full justify-start gap-2")} 
                        disabled={updating}
                      >
                        <Zap className="w-4 h-4" /> Change Plan
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleUpdatePlan(selectedUser.id, 'free')}>Free Plan</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdatePlan(selectedUser.id, 'pro')}>Pro Plan</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdatePlan(selectedUser.id, 'ultra')}>Ultra Plan</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="outline" className="w-full justify-start gap-2" disabled={updating} onClick={() => handleResetPassword(selectedUser.id)}>
                      <KeyRound className="w-4 h-4" /> Reset Password
                    </Button>
                    
                    <Button variant="outline" className="w-full justify-start gap-2" disabled={updating} onClick={() => toast.info('Messaging system not yet implemented.')}>
                      <MessageSquare className="w-4 h-4" /> Send Message
                    </Button>

                    {selectedUser.role === 'suspended' ? (
                      <Button variant="outline" className="w-full justify-start gap-2 border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950" onClick={() => handleUpdateRole(selectedUser.id, 'student')} disabled={updating}>
                        <UserCheck className="w-4 h-4" /> Unsuspend
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full justify-start gap-2 border-orange-500/20 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950" onClick={() => handleUpdateRole(selectedUser.id, 'suspended')} disabled={updating}>
                        <Ban className="w-4 h-4" /> Suspend
                      </Button>
                    )}

                    <Button variant="destructive" className="w-full justify-start gap-2" disabled={updating} onClick={() => handleDeleteUser(selectedUser.id)}>
                      <Trash2 className="w-4 h-4" /> Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
