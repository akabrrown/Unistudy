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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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

  // Selected Submission Modal
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this inquiry?')) return;
    try {
      const res = await fetch(`/api/admin/support?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Inquiry deleted');
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      if (selectedSubmission?.id === id) setSelectedSubmission(null);
    } catch {
      toast.error('Failed to delete inquiry');
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <LifeBuoy className="w-6 h-6 text-[#00004E] dark:text-[#D89A06]" />
            Student Support Desk &amp; Inquiries
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage incoming contact submissions, technical bug reports, and student assistance requests live.
          </p>
        </div>
        <Button
          onClick={fetchSubmissions}
          variant="outline"
          size="sm"
          disabled={loading}
          className="gap-1.5 cursor-pointer text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'all' ? 'border-primary ring-1 ring-primary/30 bg-muted/20' : 'border-border bg-card'
          }`}
        >
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">All Inquiries</div>
          <div className="text-2xl font-bold text-foreground mt-1 tabular-nums">{stats.total}</div>
        </div>
        <div
          onClick={() => setStatusFilter('unread')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'unread' ? 'border-amber-500 ring-1 ring-amber-500/30 bg-amber-500/10' : 'border-border bg-card'
          }`}
        >
          <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Unread / New
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">{stats.unread}</div>
        </div>
        <div
          onClick={() => setStatusFilter('in_progress')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'in_progress' ? 'border-blue-500 ring-1 ring-blue-500/30 bg-blue-500/10' : 'border-border bg-card'
          }`}
        >
          <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            In Progress
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 tabular-nums">{stats.in_progress}</div>
        </div>
        <div
          onClick={() => setStatusFilter('resolved')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'resolved' ? 'border-emerald-500 ring-1 ring-emerald-500/30 bg-emerald-500/10' : 'border-border bg-card'
          }`}
        >
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Resolved
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{stats.resolved}</div>
        </div>
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

      {/* Submissions List */}
      <div className="grid gap-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-card/50 text-muted-foreground text-xs">
            No inquiries matching this filter.
          </div>
        ) : (
          filtered.map((sub) => (
            <div
              key={sub.id}
              onClick={() => {
                setSelectedSubmission(sub);
                setAdminNotes(sub.admin_notes || '');
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
                selectedSubmission?.id === sub.id
                  ? 'border-primary ring-2 ring-primary/20 bg-muted/20'
                  : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Badge
                    className={`text-[10px] font-semibold ${
                      sub.status === 'unread'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                        : sub.status === 'in_progress'
                        ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {sub.status.toUpperCase()}
                  </Badge>
                  <h3 className="text-sm font-bold text-foreground">{sub.subject}</h3>
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(sub.created_at).toLocaleDateString()} at{' '}
                  {new Date(sub.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2">{sub.message}</p>

              <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-primary" />
                    {sub.name}
                  </span>
                  <span>({sub.email})</span>
                </div>
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleUpdateStatus(sub.id, sub.status === 'resolved' ? 'unread' : 'resolved')}
                    className="px-2 py-1 rounded text-[11px] font-medium border border-border hover:bg-muted transition-colors cursor-pointer"
                  >
                    {sub.status === 'resolved' ? 'Mark Unread' : 'Mark Resolved'}
                  </button>
                  <button
                    onClick={() => handleDelete(sub.id)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* INQUIRY DETAIL DRAWER / MODAL */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">{selectedSubmission.subject}</h3>
                <p className="text-xs text-muted-foreground">
                  From {selectedSubmission.name} &lt;{selectedSubmission.email}&gt;
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs text-foreground leading-relaxed whitespace-pre-wrap">
              {selectedSubmission.message}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground block">
                Admin Resolution Notes / Internal Response Record
              </label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Log notes about phone outreach, resolved issue, or follow-up action..."
                rows={3}
                className="text-xs"
              />
              <Button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                size="sm"
                variant="outline"
                className="text-xs cursor-pointer"
              >
                Save Notes
              </Button>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <a
                href={`mailto:${selectedSubmission.email}?subject=Re: ${encodeURIComponent(selectedSubmission.subject)}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                Reply via Student Email
              </a>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleUpdateStatus(selectedSubmission.id, 'resolved')}
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Mark Resolved
                </Button>
                <Button
                  onClick={() => setSelectedSubmission(null)}
                  variant="ghost"
                  size="sm"
                  className="text-xs cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
