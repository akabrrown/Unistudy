'use client';

import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Search,
  RefreshCw,
  Mail,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Trash2,
  X,
  Filter,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { CopyableId } from '@/components/ui/copyable-id';
import { toast } from 'sonner';

interface Submission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'in_progress' | 'resolved';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminSupportPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState({ total: 0, unread: 0, in_progress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Selected Submission Drawer & Delete Confirmation
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/support?status=${statusFilter}`);
      const data = await res.json();
      setSubmissions(data.submissions || []);
      setStats(data.stats || { total: 0, unread: 0, in_progress: 0, resolved: 0 });
    } catch {
      toast.error('Failed to load support inquiries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Marked as ${newStatus}`);
      fetchSubmissions();
      if (selectedSubmission?.id === id) {
        setSelectedSubmission((prev) => (prev ? { ...prev, status: newStatus as any } : null));
      }
    } catch {
      toast.error('Failed to update inquiry status');
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedSubmission) return;
    setSavingNotes(true);
    try {
      const res = await fetch('/api/admin/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedSubmission.id, admin_notes: adminNotes }),
      });
      if (!res.ok) throw new Error();
      toast.success('Admin resolution notes saved');
      fetchSubmissions();
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/support?id=${deleteTargetId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Inquiry deleted');
      setSubmissions((prev) => prev.filter((s) => s.id !== deleteTargetId));
      if (selectedSubmission?.id === deleteTargetId) setSelectedSubmission(null);
      setDeleteTargetId(null);
    } catch {
      toast.error('Failed to delete inquiry');
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const filtered = search
    ? submissions.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.email.toLowerCase().includes(search.toLowerCase()) ||
          s.subject.toLowerCase().includes(search.toLowerCase()) ||
          s.message.toLowerCase().includes(search.toLowerCase())
      )
    : submissions;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <AdminPageHeader
        title="Student Support Desk"
        count={stats.total}
        subtitle="Triage incoming contact submissions, technical reports, and student assistance requests."
        actions={
          <Button
            onClick={fetchSubmissions}
            variant="outline"
            size="sm"
            disabled={loading}
            className="gap-1.5 cursor-pointer text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminMetricCard
          label="All Inquiries"
          value={stats.total}
          subtext="Total tickets"
          icon={LifeBuoy}
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <AdminMetricCard
          label="Unread / New"
          value={stats.unread}
          subtext="Awaiting triage"
          deltaTone={stats.unread > 0 ? 'negative' : 'neutral'}
          icon={AlertCircle}
          active={statusFilter === 'unread'}
          onClick={() => setStatusFilter('unread')}
        />
        <AdminMetricCard
          label="In Progress"
          value={stats.in_progress}
          subtext="Assigned & active"
          icon={MessageSquare}
          active={statusFilter === 'in_progress'}
          onClick={() => setStatusFilter('in_progress')}
        />
        <AdminMetricCard
          label="Resolved"
          value={stats.resolved}
          subtext="Closed tickets"
          deltaTone="positive"
          icon={CheckCircle2}
          active={statusFilter === 'resolved'}
          onClick={() => setStatusFilter('resolved')}
        />
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search inquiries by student name, email, subject, or message keyword..."
          className="pl-9 h-10 text-xs"
        />
      </div>

      {/* High-Density Linear Triage Table */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Subject &amp; Message</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground text-xs">
                    No support inquiries matching this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubmission(sub);
                      setAdminNotes(sub.admin_notes || '');
                    }}
                    className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                      selectedSubmission?.id === sub.id ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono uppercase font-semibold ${
                          sub.status === 'unread'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : sub.status === 'in_progress'
                            ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {sub.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <div className="font-semibold text-foreground truncate">{sub.subject}</div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{sub.message}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-foreground">{sub.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{sub.email}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground tabular-nums">
                      <div>{new Date(sub.created_at).toLocaleDateString()}</div>
                      <div className="text-[10px]">
                        {new Date(sub.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(sub.id, sub.status === 'resolved' ? 'unread' : 'resolved')}
                          className="h-7 px-2.5 text-[11px] cursor-pointer"
                        >
                          {sub.status === 'resolved' ? 'Reopen' : 'Resolve'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(sub.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INQUIRY DETAIL SHEET DRAWER */}
      <Sheet open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
        <SheetContent className="sm:max-w-lg w-full overflow-y-auto flex flex-col justify-between">
          {selectedSubmission && (
            <>
              <div className="space-y-4">
                <SheetHeader className="border-b border-border pb-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono uppercase ${
                        selectedSubmission.status === 'unread'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                          : selectedSubmission.status === 'in_progress'
                          ? 'bg-sky-500/10 text-sky-600 border-sky-500/30'
                          : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      }`}
                    >
                      {selectedSubmission.status.replace('_', ' ')}
                    </Badge>
                    <CopyableId value={selectedSubmission.id} truncateLength={8} toastMessage="Ticket ID copied" />
                  </div>
                  <SheetTitle className="text-base font-bold mt-1">{selectedSubmission.subject}</SheetTitle>
                  <SheetDescription className="text-xs">
                    From <strong className="text-foreground">{selectedSubmission.name}</strong> ({selectedSubmission.email})
                  </SheetDescription>
                </SheetHeader>

                <div className="p-4 rounded-xl bg-muted/30 border border-border text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedSubmission.message}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground block">
                    Internal Resolution Notes
                  </label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Log notes about outreach, resolution steps, or follow-up action..."
                    rows={4}
                    className="text-xs"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(selectedSubmission.id, 'in_progress')}
                        className="h-8 text-xs cursor-pointer"
                      >
                        Mark In Progress
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(selectedSubmission.id, 'resolved')}
                        className="h-8 text-xs gap-1 cursor-pointer border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Mark Resolved
                      </Button>
                    </div>
                    <Button
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs cursor-pointer"
                    >
                      {savingNotes ? 'Saving...' : 'Save Notes'}
                    </Button>
                  </div>
                </div>
              </div>

              <SheetFooter className="pt-4 border-t border-border flex flex-row items-center justify-between gap-2">
                <a
                  href={`mailto:${selectedSubmission.email}?subject=Re: ${encodeURIComponent(selectedSubmission.subject)}`}
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Reply via Email
                </a>
                <Button
                  onClick={() => setSelectedSubmission(null)}
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs cursor-pointer"
                >
                  Close
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmActionDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Delete support inquiry?"
        description="This permanently removes the student inquiry and any attached internal resolution notes."
        confirmLabel="Delete Inquiry"
        loading={deleting}
        onConfirm={executeDelete}
      />
    </div>
  );
}
