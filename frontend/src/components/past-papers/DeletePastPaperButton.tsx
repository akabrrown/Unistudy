'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function DeletePastPaperButton({
  paperId,
  paperTitle,
  onDeleted,
}: {
  paperId: string;
  paperTitle?: string;
  onDeleted?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const title = paperTitle || 'this past paper';
    if (!confirm(`Are you sure you want to delete ${title}? All associated questions and practice attempts will be permanently deleted.`)) {
      return;
    }

    setLoading(true);
    try {
      await apiFetch(`/past-papers/${paperId}`, { method: 'DELETE' });
      toast.success('Past paper deleted');
      if (onDeleted) {
        onDeleted();
      } else {
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete past paper');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-2 h-8 w-8"
      title="Delete past paper"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </Button>
  );
}

