'use client';
import { useState, useEffect } from 'react';
import { Loader2, Quote } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';

export function DailyMotivationalQuote() {
  const [quote, setQuote] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuote();
  }, []);

  const loadQuote = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const cachedData = localStorage.getItem('dailyQuote');
      
      if (cachedData) {
        const { date, quote } = JSON.parse(cachedData);
        if (date === today) {
          setQuote(quote);
          setLoading(false);
          return;
        }
      }

      const data = await apiFetch('/ai/motivational-quote');
      const newQuote = data.quote || "Small, consistent steps build massive momentum.";
      
      localStorage.setItem('dailyQuote', JSON.stringify({ date: today, quote: newQuote }));
      setQuote(newQuote);
    } catch (err) {
      setQuote("Small, consistent steps build massive momentum.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/50 rounded-xl p-6 relative overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <Quote className="w-4 h-4 text-blue-500" />
        <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-300">Quote of the Day</h3>
      </div>
      
      <div className="relative z-10">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
        ) : (
          <p className="text-lg font-medium text-foreground italic leading-relaxed">
            "{quote}"
          </p>
        )}
      </div>
    </div>
  );
}
