'use client';

import { useCallback, useEffect, useState } from 'react';
import { Brain, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';

interface MemoryItem {
  id: string;
  fact: string;
  created_at: string;
}

export function MemoryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/memory', { cache: 'no-store' });
      if (!res.ok) throw new Error('load failed');
      const data = (await res.json()) as { memories: MemoryItem[]; unavailable?: boolean };
      setItems(data.memories || []);
      setUnavailable(Boolean(data.unavailable));
    } catch {
      toast.error('Could not load saved notes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const addFact = async () => {
    const fact = draft.trim();
    if (fact.length < 3 || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/ai/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fact }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save');
      setItems((prev) => [data.memory as MemoryItem, ...prev]);
      setDraft('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: string) => {
    const previous = items;
    setItems((prev) => prev.filter((m) => m.id !== id));
    const res = await fetch(`/api/ai/memory?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      setItems(previous);
      toast.error('Could not delete that item');
    }
  };

  const clearAll = async () => {
    if (items.length === 0) return;
    const previous = items;
    setItems([]);
    setConfirmClearOpen(false);
    const res = await fetch('/api/ai/memory?all=1', { method: 'DELETE' });
    if (!res.ok) {
      setItems(previous);
      toast.error('Could not clear saved notes');
    } else {
      toast.success('Cleared saved tutor notes');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-lg max-h-[82vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-border/80 bg-card">
          <DialogHeader className="p-4 border-b border-border/60 bg-muted/15">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] flex items-center justify-center shrink-0">
                <Brain className="h-4 w-4" />
              </div>
              <div className="text-left">
                <DialogTitle className="font-bold text-sm text-foreground">
                  Saved Study Context
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Facts your tutor keeps in mind across chats (exam dates, weak topics, preferences).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-3 border-b border-border/60 flex gap-2">
            <Input
              value={draft}
              maxLength={300}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void addFact();
                }
              }}
              placeholder="e.g. My Macroeconomics exam is on 12 December"
              className="h-9 text-xs"
            />
            <Button
              type="button"
              onClick={() => void addFact()}
              disabled={draft.trim().length < 3 || isSaving}
              className="h-9 px-3 bg-[#00004E] text-white hover:bg-[#000038] dark:bg-[#D89A06] dark:text-[#00004E] cursor-pointer"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[45vh]">
            {isLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#D89A06]" />
              </div>
            ) : unavailable ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Saved study context is currently unavailable.
              </p>
            ) : items.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Nothing saved yet. Add your exam dates or weak topics above so your tutor remembers them.
              </p>
            ) : (
              items.map((m) => (
                <div
                  key={m.id}
                  className="group flex items-start gap-2 p-2.5 rounded-lg border border-border/70 bg-background"
                >
                  <p className="flex-1 text-xs text-foreground break-words">{m.fact}</p>
                  <button
                    type="button"
                    onClick={() => void remove(m.id)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    title="Remove"
                    aria-label={`Remove: ${m.fact}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div className="p-3 border-t border-border/60 flex justify-between items-center bg-muted/10">
              <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
                {items.length} saved
              </span>
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="text-[11px] font-semibold text-destructive hover:underline cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={confirmClearOpen}
        onOpenChange={setConfirmClearOpen}
        title="Clear all saved study context?"
        description="This removes every fact your tutor currently remembers across conversations. This cannot be undone."
        confirmLabel="Clear All"
        variant="destructive"
        onConfirm={clearAll}
      />
    </>
  );
}
