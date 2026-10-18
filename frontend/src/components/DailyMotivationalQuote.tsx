'use client';
import { useState, useEffect } from 'react';
import { Loader2, Quote } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { getCuratedDailyQuote } from '@/lib/constants/quotes';

export function DailyMotivationalQuote() {
  const [quote, setQuote] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuote();
  }, []);

  const loadQuote = async () => {
    const today = new Date().toISOString().split('T')[0];
    const defaultQuote = getCuratedDailyQuote(today);

    try {
      const cachedData = localStorage.getItem('dailyQuoteV2');
      
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          if (parsed.date === today && parsed.quote) {
            setQuote(parsed.quote);
            setAuthor(parsed.author || 'Unknown');
            setLoading(false);
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
      setQuote(newQuote);
      setAuthor(newAuthor);
    } catch {
      // Rotating daily fallback guaranteed to change every day
      setQuote(defaultQuote.quote);
      setAuthor(defaultQuote.author);
    } finally {
      setLoading(false);
    }
  };

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
                — {author}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
