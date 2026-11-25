'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { ArrowLeft, MessageSquare, ThumbsUp, Loader2, GraduationCap, Send, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Thread {
  id: string;
  title: string;
  body: string;
  upvotes: number;
  created_at: string;
  is_ai_answered: boolean;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface Reply {
  id: string;
  body: string;
  upvotes: number;
  created_at: string;
  is_ai: boolean;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export default function ThreadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const threadId = params.threadId as string;

  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);

  const [newReply, setNewReply] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (threadId) {
      void fetchThreadData();
    }
  }, [threadId]);

  const fetchThreadData = async () => {
    try {
      const res = await fetch(`/api/discussion/${threadId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setThread(data.thread);
      setReplies(data.replies || []);
    } catch (err: any) {
      toast.error(err.message || 'Could not load discussion thread');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/discussion/${threadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newReply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setReplies([...replies, data.reply]);
      setNewReply('');
      toast.success('Reply posted');
    } catch (err: any) {
      toast.error(err.message || 'Could not post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvote = async (target: 'thread' | 'reply', replyId?: string) => {
    try {
      const res = await fetch(`/api/discussion/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, replyId }),
      });
      if (!res.ok) throw new Error('Failed to upvote');

      if (target === 'thread' && thread) {
        setThread({ ...thread, upvotes: thread.upvotes + 1 });
      } else if (target === 'reply' && replyId) {
        setReplies(replies.map((r) => (r.id === replyId ? { ...r, upvotes: r.upvotes + 1 } : r)));
      }
    } catch (err: any) {
      toast.error(err.message || 'Upvote failed');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-5">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <h2 className="text-lg font-bold">Thread not found</h2>
        <Button onClick={() => router.push(`/dashboard/courses/${courseId}/discussion`)}>
          Back to Discussions
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-6 pb-16">
      {/* Header */}
      <header className="border-b border-border/80 pb-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/dashboard/courses/${courseId}/discussion`)}
          className="cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">{thread.title}</h1>
      </header>

      {/* Original Post */}
      <article className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 sm:p-6 flex gap-4">
        <div className="flex flex-col items-center gap-1.5 tabular-nums">
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl h-9 w-9 cursor-pointer"
            onClick={() => handleUpvote('thread')}
          >
            <ThumbsUp className="w-4 h-4" />
          </Button>
          <span className="font-mono font-bold text-sm">{thread.upvotes}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground mb-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center text-xs font-bold text-primary">
              {thread.profiles?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thread.profiles.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                thread.profiles?.full_name?.charAt(0).toUpperCase() || <User size={12} />
              )}
            </div>
            <span className="font-semibold text-foreground">
              {thread.profiles?.full_name || 'Student'}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(thread.created_at).toLocaleString()}
            </span>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {thread.body}
            </ReactMarkdown>
          </div>
        </div>
      </article>

      {/* Replies Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1 text-sm font-bold text-foreground tabular-nums">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span>{replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}</span>
        </div>

        <div className="space-y-3">
          {replies.map((reply) => (
            <article
              key={reply.id}
              className={cn(
                'rounded-2xl border p-5 flex gap-4',
                reply.is_ai
                  ? 'border-border/80 border-l-4 border-l-[#D89A06] bg-[#00004E]/[0.03] dark:bg-white/[0.03]'
                  : 'bg-card border-border/80 shadow-2xs'
              )}
            >
              <div className="flex flex-col items-center gap-1 tabular-nums">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl h-8 w-8 hover:bg-muted cursor-pointer"
                  onClick={() => handleUpvote('reply', reply.id)}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </Button>
                <span className="font-mono font-semibold text-xs">{reply.upvotes}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 text-xs mb-2.5">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full overflow-hidden flex items-center justify-center font-bold text-xs shrink-0',
                      reply.is_ai
                        ? 'bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E]'
                        : 'bg-primary/10 text-primary'
                    )}
                  >
                    {reply.is_ai ? (
                      <GraduationCap className="w-4 h-4" />
                    ) : reply.profiles?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={reply.profiles.avatar_url}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      reply.profiles?.full_name?.charAt(0).toUpperCase() || <User size={12} />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-foreground">
                      {reply.is_ai
                        ? 'Course Study Tutor'
                        : reply.profiles?.full_name || 'Student'}
                    </span>
                    {reply.is_ai && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-bold bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06]/20 dark:text-[#D89A06]">
                        Tutor Response
                      </span>
                    )}
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">
                      {new Date(reply.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {reply.body}
                  </ReactMarkdown>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Reply Form */}
      <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 sm:p-6">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-foreground">
          <MessageSquare className="w-4 h-4 text-primary" /> Add a Reply
        </h3>
        <form onSubmit={handleReply} className="space-y-3">
          <Textarea
            placeholder="Write your reply (Markdown and $LaTeX$ math supported)..."
            className="min-h-[110px] resize-none text-sm"
            value={newReply}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewReply(e.target.value)}
            required
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || !newReply.trim()}
              className="bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] text-xs font-bold cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Send className="w-3.5 h-3.5 mr-1.5" />
              )}
              Post Reply
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
