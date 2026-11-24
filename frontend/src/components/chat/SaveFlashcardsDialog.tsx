'use client';

import { useEffect, useState } from 'react';
import { Layers, Loader2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { StreamAskError, streamAsk, stripProtocolTags } from '@/lib/chat/streamAsk';

interface DraftCard {
  front: string;
  back: string;
}

function parseCards(raw: string): DraftCard[] {
  const cleaned = stripProtocolTags(raw).replace(/```json|```/gi, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start < 0 || end <= start) return [];
  try {
    const arr = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(arr)) return [];
    return arr
      .map((c) => ({
        front: String(c?.front ?? c?.question ?? '').trim().slice(0, 600),
        back: String(c?.back ?? c?.answer ?? '').trim().slice(0, 1500),
      }))
      .filter((c) => c.front && c.back)
      .slice(0, 12);
  } catch {
    return [];
  }
}

interface Props {
  open: boolean;
  sourceText: string;
  lectureId?: string;
  onClose: () => void;
}

export function SaveFlashcardsDialog({ open, sourceText, lectureId, onClose }: Props) {
  const [cards, setCards] = useState<DraftCard[]>([]);
  const [phase, setPhase] = useState<'idle' | 'generating' | 'ready' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCards([]);
      setPhase('idle');
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const generate = async () => {
    setPhase('generating');
    setError(null);
    try {
      const final = await streamAsk({
        feature: 'chat-utility',
        payload: {
          temperature: 0.2,
          systemPrompt:
            'You turn study explanations into flashcards. Reply with ONLY a JSON array of up to 8 objects shaped {"front": string, "back": string}. Fronts are specific questions or prompts. Backs are concise, accurate answers taken only from the provided text. No markdown, no commentary.',
          messages: [{ role: 'user', content: sourceText.slice(0, 12000) }],
        },
      });
      const text = final.result?.choices?.[0]?.message?.content || '';
      const parsed = parseCards(text);
      if (parsed.length === 0) throw new Error('The tutor could not extract flashcards from this answer.');
      setCards(parsed);
      setPhase('ready');
      if (typeof final.remainingCredits === 'number') {
        window.dispatchEvent(
          new CustomEvent('unistudy-credits-changed', {
            detail: {
              balance: final.remainingCredits,
              freePasses: final.freePasses,
              paidCredits: final.paidCredits,
              secondsUntilRefill: final.secondsUntilRefill,
            },
          })
        );
      }
    } catch (err) {
      setError(err instanceof StreamAskError || err instanceof Error ? err.message : 'Generation failed');
      setPhase('idle');
    }
  };

  const save = async () => {
    if (cards.length === 0) return;
    setPhase('saving');
    try {
      const res = await fetch('/api/ai/chat-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lectureId, cards }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save flashcards');
      toast.success(`Saved ${data.count ?? cards.length} flashcards to your deck`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save flashcards');
      setPhase('ready');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Save as flashcards"
      onClick={onClose}
    >
      <div
        className="bg-card border-2 border-[#D89A06]/40 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#00004E] text-[#D89A06] flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-sm text-[#00004E] dark:text-white">Save as flashcards</h3>
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

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {phase === 'idle' && (
            <div className="text-center py-6 space-y-3">
              <p className="text-xs text-muted-foreground">
                The tutor will draft up to 8 cards from this answer. You can edit or remove them before saving.
                Drafting uses 1 AI credit.
              </p>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <Button
                type="button"
                onClick={() => void generate()}
                className="bg-[#00004E] text-white hover:bg-[#000038] dark:bg-[#D89A06] dark:text-[#00004E] cursor-pointer"
              >
                Draft flashcards
              </Button>
            </div>
          )}

          {phase === 'generating' && (
            <div className="py-10 flex flex-col items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-[#D89A06]" />
              Drafting cards…
            </div>
          )}

          {(phase === 'ready' || phase === 'saving') &&
            cards.map((card, idx) => (
              <div key={idx} className="rounded-xl border border-border p-3 space-y-2 bg-background">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Card {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCards((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-1 rounded text-muted-foreground hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
                    title="Remove card"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea
                  value={card.front}
                  onChange={(e) =>
                    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, front: e.target.value } : c)))
                  }
                  rows={2}
                  maxLength={600}
                  aria-label={`Card ${idx + 1} question`}
                  className="w-full rounded-lg border border-border bg-card p-2 text-xs font-semibold resize-none focus:outline-none focus:border-[#D89A06]"
                />
                <textarea
                  value={card.back}
                  onChange={(e) =>
                    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, back: e.target.value } : c)))
                  }
                  rows={3}
                  maxLength={1500}
                  aria-label={`Card ${idx + 1} answer`}
                  className="w-full rounded-lg border border-border bg-card p-2 text-xs resize-none focus:outline-none focus:border-[#D89A06]"
                />
              </div>
            ))}
          {error && (phase === 'ready' || phase === 'saving') && <p className="text-xs text-red-600">{error}</p>}
        </div>

        {(phase === 'ready' || phase === 'saving') && (
          <div className="p-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void save()}
              disabled={cards.length === 0 || phase === 'saving'}
              className="bg-[#00004E] text-white hover:bg-[#000038] dark:bg-[#D89A06] dark:text-[#00004E] cursor-pointer"
            >
              {phase === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : `Save ${cards.length} cards`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
