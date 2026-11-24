'use client';

import { useCallback, useEffect, useState } from 'react';
import { Brain, Loader2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/memory', { cache: 'no-store' });
      if (!res.ok) throw new Error('load failed');
      const data = (await res.json()) as { memories: MemoryItem[]; unavailable?: boolean };
      setItems(data.memories || []);
      setUnavailable(Boolean(data.unavailable));
    } catch {
      toast.error('Could not load tutor memory');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

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
      toast.error('Could not delete that memory');
    }
  };

  const clearAll = async () => {
    if (items.length === 0) return;
    if (!window.confirm('Delete everything the tutor remembers about you?')) return;
    const previous = items;
    setItems([]);
    const res = await fetch('/api/ai/memory?all=1', { method: 'DELETE' });
    if (!res.ok) {
      setItems(previous);
      toast.error('Could not clear memory');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Tutor memory"
      onClick={onClose}
    >
      <div
        className="bg-card border-2 border-[#D89A06]/40 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#00004E] text-[#D89A06] flex items-center justify-center">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#00004E] dark:text-white">What your tutor remembers</h3>
              <p className="text-xs text-muted-foreground">Used in every new chat. You control it.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

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

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#D89A06]" />
            </div>
          ) : unavailable ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Memory is not enabled on this database yet. Apply the latest migration to turn it on.
            </p>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Nothing saved yet. Tell the tutor things like your exam dates or weak topics and it will
              remember them, or add one above.
            </p>
          ) : (
            items.map((m) => (
              <div
                key={m.id}
                className="group flex items-start gap-2 p-2.5 rounded-lg border border-border bg-background"
              >
                <p className="flex-1 text-xs text-foreground break-words">{m.fact}</p>
                <button
                  type="button"
                  onClick={() => void remove(m.id)}
                  className="p-1 rounded text-muted-foreground hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
                  title="Forget this"
                  aria-label={`Forget: ${m.fact}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-3 border-t border-border flex justify-between items-center">
            <span className="text-[11px] text-muted-foreground">{items.length} saved</span>
            <button
              type="button"
              onClick={() => void clearAll()}
              className="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
            >
              Forget everything
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
