'use client';
import { useState, useEffect } from 'react';
import { Loader2, Quote } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { getCuratedDailyQuote } from '@/lib/constants/quotes';

export function DailyMotivationalQuote({ compact = false }: { compact?: boolean }) {
  const [quote, setQuote] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadQuote = async () => {
      const today = new Date().toISOString().split('T')[0];
      const defaultQuote = getCuratedDailyQuote(today);

      try {
        const cachedData = localStorage.getItem('dailyQuoteV2');

        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            if (parsed.date === today && parsed.quote) {
              if (active) {
                setQuote(parsed.quote);
                setAuthor(parsed.author || 'Unknown');
                setLoading(false);
              }
              return;
            }
          } catch {
            // invalid cache, continue
          }
        }

        const data = await apiFetch('/settings/daily-quote');
        const newQuote = data.quote || defaultQuote.quote;
        const newAuthor = data.author || defaultQuote.author;

        localStorage.setItem('dailyQuoteV2', JSON.stringify({ date: today, quote: newQuote, author: newAuthor }));
        if (active) {
          setQuote(newQuote);
          setAuthor(newAuthor);
        }
      } catch {
        if (active) {
          setQuote(defaultQuote.quote);
          setAuthor(defaultQuote.author);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadQuote();
    return () => {
      active = false;
    };
  }, []);

  if (compact) {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground">
        <Quote className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/70" />
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        ) : (
          <p className="leading-relaxed">
            <span className="text-foreground/90 font-medium">&ldquo;{quote}&rdquo;</span>
            {author ? <span className="ml-1.5 text-muted-foreground">({author})</span> : null}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border/40 bg-card/30 p-8 transition-all hover:bg-card/60">
      <div className="relative z-10">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="flex flex-col gap-5">
            <Quote className="h-5 w-5 text-muted-foreground/30" />
            <p className="text-lg md:text-xl text-foreground font-serif leading-relaxed tracking-tight">
              “{quote}”
            </p>
            {author && (
              <p className="text-sm font-medium text-muted-foreground">
                {author}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
