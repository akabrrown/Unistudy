'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Plus, Loader2, ArrowLeft, ThumbsUp, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';
import { SPRING_SNAPPY, useAppReducedMotion } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Thread {
  id: string;
  title: string;
  body: string;
  author_name: string;
  author_avatar: string | null;
  upvotes: number;
  reply_count: number;
  is_ai_answered: boolean;
  created_at: string;
}

type ThreadFilter = 'all' | 'unanswered' | 'verified';

export default function CourseDiscussionPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const reducedMotion = useAppReducedMotion();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ThreadFilter>('all');

  // Create Thread State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void fetchThreads();
  }, [courseId]);

  const fetchThreads = async () => {
    try {
      const res = await fetch(`/api/discussion?courseId=${courseId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setThreads(data.threads || []);
    } catch (err: any) {
      toast.error(err.message || 'Could not load discussions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/discussion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          title: newTitle,
          body: newBody,
          tags: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Discussion posted');
      setIsDialogOpen(false);
      setNewTitle('');
      setNewBody('');
      void fetchThreads();
    } catch (err: any) {
      toast.error(err.message || 'Could not post discussion');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredThreads = useMemo(() => {
    if (filter === 'unanswered') return threads.filter((t) => t.reply_count === 0);
    if (filter === 'verified') return threads.filter((t) => t.is_ai_answered);
    return threads;
  }, [threads, filter]);

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/courses/${courseId}`)}
            className="shrink-0 mt-0.5 cursor-pointer"
            aria-label="Back to Course Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Course Discussions
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Ask course questions, compare derivations, and review verified explanations.
            </p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-xl text-xs font-bold bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] shadow-xs h-9 px-4 gap-1.5 cursor-pointer shrink-0">
            <Plus className="w-3.5 h-3.5" /> New Question
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleCreateThread}>
              <DialogHeader>
                <DialogTitle>Post a Course Question</DialogTitle>
                <DialogDescription>
                  Include the lecture week or slide topic so classmates and the course tutor can respond clearly.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Question Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Week 4: Clarifying characteristic polynomial roots"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    minLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Details (Markdown &amp; $LaTeX$ supported)</Label>
                  <Textarea
                    id="body"
                    placeholder="Share your working steps or what feels unclear..."
                    className="min-h-[150px]"
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    required
                    minLength={10}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim() || !newBody.trim()}
                  className="bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E]"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Post Question
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Filter Strip */}
      <div className="inline-flex items-center rounded-xl border border-border bg-muted/30 p-1 gap-1">
        {(
          [
            { id: 'all', label: `All (${threads.length})` },
            { id: 'unanswered', label: `Unanswered (${threads.filter((t) => t.reply_count === 0).length})` },
            { id: 'verified', label: `Tutor Answered (${threads.filter((t) => t.is_ai_answered).length})` },
          ] as const
        ).map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                'relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer tabular-nums',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {active && (
                <motion.span
                  layoutId="discussion-filter-tab"
                  transition={reducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                  className="absolute inset-0 rounded-lg bg-background border border-border/60 shadow-2xs"
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-10 bg-card rounded-2xl border border-border/80 space-y-3">
          <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-bold text-foreground">No matching discussions</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {threads.length === 0
              ? 'Start the first course thread to ask about lecture slides or worked examples.'
              : 'Switch filters above or post a new question.'}
          </p>
          <Button
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] cursor-pointer"
          >
            New Question
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
          {filteredThreads.map((thread) => (
            <Link
              key={thread.id}
              href={`/dashboard/courses/${courseId}/discussion/${thread.id}`}
              className="p-5 flex gap-4 hover:bg-muted/25 transition-colors group"
            >
              <div className="flex flex-col items-center justify-start gap-1 w-11 shrink-0 pt-0.5 tabular-nums">
                <ThumbsUp className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-mono font-bold text-foreground">{thread.upvotes}</span>
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                  {thread.title}
                </h3>
                <p className="text-muted-foreground line-clamp-2 text-xs sm:text-sm leading-relaxed">
                  {thread.body}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center font-bold text-[10px] text-primary">
                      {thread.author_avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thread.author_avatar}
                          alt={thread.author_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        thread.author_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="font-medium text-foreground/85">{thread.author_name}</span>
                  </div>
                  <span>·</span>
                  <span>{new Date(thread.created_at).toLocaleDateString()}</span>

                  <div className="flex items-center gap-1.5 ml-auto tabular-nums">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{thread.reply_count}</span>
                  </div>

                  {thread.is_ai_answered && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#00004E]/10 dark:bg-[#D89A06]/15 text-[#00004E] dark:text-[#D89A06] border border-[#00004E]/20 dark:border-[#D89A06]/30 text-[11px] font-semibold">
                      <GraduationCap className="w-3 h-3" />
                      <span>Tutor Verified</span>
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
