'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Plus, Loader2, ArrowLeft, ThumbsUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

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

export default function CourseDiscussionPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Thread State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchThreads();
  }, [courseId]);

  const fetchThreads = async () => {
    try {
      const res = await fetch(`/api/discussion?courseId=${courseId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setThreads(data.threads || []);
    } catch (err: any) {
      toast.error(err.message);
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
          tags: []
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success('Thread created!');
      setIsDialogOpen(false);
      setNewTitle('');
      setNewBody('');
      fetchThreads(); // Refresh list
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-6 overflow-y-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/courses')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Course Discussions</h1>
          <p className="text-muted-foreground">Ask questions, share insights, and learn together.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 gap-2">
            <Plus className="w-4 h-4" /> New Discussion
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleCreateThread}>
              <DialogHeader>
                <DialogTitle>Start a Discussion</DialogTitle>
                <DialogDescription>
                  Ask a question or share something related to this course.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input 
                    id="title" 
                    placeholder="e.g. Help understanding backpropagation" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    minLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Details</Label>
                  <Textarea 
                    id="body" 
                    placeholder="Explain what you need help with..." 
                    className="min-h-[150px]"
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    required
                    minLength={10}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting || !newTitle.trim() || !newBody.trim()}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Post Discussion
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : threads.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-card rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2">No discussions yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6">Be the first to start a conversation or ask a question about this course.</p>
          <Button onClick={() => setIsDialogOpen(true)}>Start a Discussion</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {threads.map(thread => (
            <Link key={thread.id} href={`/dashboard/courses/${courseId}/discussion/${thread.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-5 flex gap-4">
                  <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled>
                      <ThumbsUp className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-semibold">{thread.upvotes}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold group-hover:text-primary transition-colors truncate">
                      {thread.title}
                    </h3>
                    <p className="text-muted-foreground line-clamp-2 text-sm mt-1 mb-3">
                      {thread.body}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center font-bold text-[10px] text-primary">
                          {thread.author_avatar ? (
                            <img src={thread.author_avatar} alt={thread.author_name} className="w-full h-full object-cover" />
                          ) : (
                            thread.author_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span>{thread.author_name}</span>
                      </div>
                      <span>•</span>
                      <span>{new Date(thread.created_at).toLocaleDateString()}</span>
                      
                      <div className="flex items-center gap-1.5 ml-auto">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{thread.reply_count} replies</span>
                      </div>
                      
                      {thread.is_ai_answered && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-medium">
                          <Sparkles className="w-3 h-3" />
                          <span>AI Answered</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
