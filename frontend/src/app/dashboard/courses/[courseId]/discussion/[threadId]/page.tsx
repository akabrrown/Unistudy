'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, ThumbsUp, Loader2, Sparkles, Send, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

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
      fetchThreadData();
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
      toast.error(err.message);
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
        body: JSON.stringify({ body: newReply })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setReplies([...replies, data.reply]);
      setNewReply('');
      toast.success('Reply posted!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvote = async (target: 'thread' | 'reply', replyId?: string) => {
    try {
      const res = await fetch(`/api/discussion/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, replyId })
      });
      if (!res.ok) throw new Error('Failed to upvote');
      
      if (target === 'thread' && thread) {
        setThread({ ...thread, upvotes: thread.upvotes + 1 });
      } else if (target === 'reply' && replyId) {
        setReplies(replies.map(r => r.id === replyId ? { ...r, upvotes: r.upvotes + 1 } : r));
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <h2 className="text-xl font-bold">Thread not found</h2>
        <Button className="mt-4" onClick={() => router.push(`/dashboard/courses/${courseId}/discussion`)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/courses/${courseId}/discussion`)} className="mr-4">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{thread.title}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-background/50 space-y-6">
        
        {/* Original Post */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 flex gap-4">
          <div className="flex flex-col items-center gap-2">
            <Button variant="outline" size="icon" className="rounded-full" onClick={() => handleUpvote('thread')}>
              <ThumbsUp className="w-4 h-4" />
            </Button>
            <span className="font-bold text-lg">{thread.upvotes}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
              <div className="w-6 h-6 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center text-xs font-bold text-primary">
                {thread.profiles?.avatar_url ? (
                  <img src={thread.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  thread.profiles?.full_name?.charAt(0).toUpperCase() || <User size={12} />
                )}
              </div>
              <span className="font-medium text-foreground">{thread.profiles?.full_name || 'Anonymous'}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(thread.created_at).toLocaleString()}</span>
              </div>
            </div>
            
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{thread.body}</p>
            </div>
          </div>
        </div>

        {/* Replies Header */}
        <div className="flex items-center gap-2 px-2">
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{replies.length} Replies</h2>
        </div>

        {/* Replies List */}
        <div className="space-y-4">
          {replies.map(reply => (
            <div 
              key={reply.id} 
              className={`rounded-2xl border p-5 flex gap-4 ${
                reply.is_ai 
                  ? 'bg-indigo-500/5 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                  : 'bg-card border-border shadow-sm'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted" onClick={() => handleUpvote('reply', reply.id)}>
                  <ThumbsUp className="w-4 h-4" />
                </Button>
                <span className="font-semibold text-sm">{reply.upvotes}</span>
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm ${reply.is_ai ? 'bg-indigo-500 text-white' : 'bg-primary/10 text-primary'}`}>
                      {reply.is_ai ? (
                        <Sparkles className="w-4 h-4" />
                      ) : reply.profiles?.avatar_url ? (
                        <img src={reply.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        reply.profiles?.full_name?.charAt(0).toUpperCase() || <User size={14} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {reply.is_ai ? 'UniStudy AI Tutor' : (reply.profiles?.full_name || 'Anonymous')}
                        </span>
                        {reply.is_ai && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-indigo-500 text-white">
                            Verified AI
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(reply.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                  <p className="whitespace-pre-wrap">{reply.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reply Form */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mt-8">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Post a Reply
          </h3>
          <form onSubmit={handleReply} className="space-y-4">
            <Textarea 
              placeholder="Write your response here..." 
              className="min-h-[120px] resize-none"
              value={newReply}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewReply(e.target.value)}
              required
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || !newReply.trim()}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Post Reply
              </Button>
            </div>
          </form>
        </div>
        
      </div>
    </div>
  );
}
