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
      <div className="flex items-start gap-2.5 rounded-xl border border-[#D89A06]/35 bg-gradient-to-r from-[#FEF8E7] to-white dark:from-[#00004E]/30 dark:to-card px-3.5 py-2.5 text-xs shadow-2xs border-l-4 border-l-[#D89A06]">
        <Quote className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#D89A06]" />
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D89A06]" />
        ) : (
          <p className="leading-relaxed">
            <span className="text-[#00004E] dark:text-white font-medium">&ldquo;{quote}&rdquo;</span>
            {author ? <span className="ml-1.5 text-[#8C6404] dark:text-[#D89A06] font-semibold text-[11px]">— {author}</span> : null}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border-2 border-[#D89A06]/30 bg-gradient-to-br from-[#FEF8E7]/90 via-white to-[#F0F3F9] dark:from-[#00004E]/40 dark:via-card dark:to-card p-8 transition-all hover:border-[#D89A06] shadow-sm">
      <div className="relative z-10">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#D89A06]" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="w-9 h-9 rounded-xl bg-[#00004E] text-[#D89A06] flex items-center justify-center border border-[#D89A06]/40 shadow-xs">
              <Quote className="h-4 w-4" />
            </div>
            <p className="text-lg md:text-xl text-[#00004E] dark:text-white font-serif leading-relaxed tracking-tight italic">
              “{quote}”
            </p>
            {author && (
              <p className="text-xs font-bold uppercase tracking-wider text-[#D89A06]">
                — {author}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
