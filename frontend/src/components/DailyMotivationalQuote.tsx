'use client';
import { useState, useEffect } from 'react';
import { Loader2, Quote } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';

export function DailyMotivationalQuote() {
  const [quote, setQuote] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuote();
  }, []);

  const loadQuote = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const cachedData = localStorage.getItem('dailyQuoteV2');
      
      if (cachedData) {
        const { date, quote, author } = JSON.parse(cachedData);
        if (date === today) {
          setQuote(quote);
          setAuthor(author);
          setLoading(false);
          return;
        }
      }

      const res = await apiFetch('/api/settings/daily-quote');
      const data = await res.json();
      const newQuote = data.quote || "Small, consistent steps build massive momentum.";
      const newAuthor = data.author || "Unknown";
      
      localStorage.setItem('dailyQuoteV2', JSON.stringify({ date: today, quote: newQuote, author: newAuthor }));
      setQuote(newQuote);
      setAuthor(newAuthor);
    } catch (err) {
      setQuote("Small, consistent steps build massive momentum.");
      setAuthor("Unknown");
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
