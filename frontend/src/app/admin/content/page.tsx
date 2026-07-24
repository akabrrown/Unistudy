'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { toast } from 'sonner';

export default function ContentPage() {
  const [lectures, setLectures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchContent = async () => {
    try {
      const res = await apiFetch('/admin/content');
      setLectures(res.content || []);
    } catch (err: any) {
      console.error("Failed to fetch admin content:", err);
      toast.error(err.message || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this content?')) return;
    setDeleting(id);
    try {
      await apiFetch(`/admin/content/${id}`, { method: 'DELETE' });
      setLectures((prev) => prev.filter((l) => l.id !== id));
      toast.success('Content removed successfully');
    } catch (err: any) {
      toast.error(err.message || 'Could not remove content');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle>Content Moderation</CardTitle>
          <CardDescription>Manage uploaded lectures and past papers across the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b border-border">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lectures.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No content found.
                    </td>
                  </tr>
                )}
                {lectures.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-4 font-medium text-foreground">{item.title}</td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {item.courses?.course_code ? `${item.courses.course_code} - ${item.courses.title || ''}` : 'Unknown Course'}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {format(new Date(item.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting === item.id}
                        className="h-8 gap-1.5 text-xs"
                      >
                        {deleting === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
