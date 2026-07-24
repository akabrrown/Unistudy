'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FileText, Layers, Award, Sparkles, ChevronRight, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');
  const [isEnhanced, setIsEnhanced] = useState(false);

  useEffect(() => {
    if (!query) return;

    const fetchResults = async () => {
      setLoading(true);
      setError('');
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ query })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to search');
        
        setResults(data.data);
        setIsEnhanced(data.enhanced || false);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Sparkles className="w-12 h-12 mb-4 opacity-50" />
        <p>Type anything in the search bar to find answers across your study materials.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Search Results</h1>
        {isEnhanced && (
          <div className="flex items-center gap-2 px-3 py-1 bg-brand-purple/10 text-brand-purple rounded-full text-sm font-medium border border-brand-purple/20">
            <Sparkles className="w-4 h-4" /> Enhanced Ranking Active
          </div>
        )}
      </div>

      <p className="text-muted-foreground text-lg">Showing matches for: <span className="text-foreground font-semibold">"{query}"</span></p>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted/30 rounded-xl border border-border animate-pulse"></div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500">
          <p className="font-semibold">Search failed</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : results ? (
        <div className="grid gap-8">
          
          {/* Slides */}
          {results.slides?.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-purple" /> Lecture Slides
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {results.slides.map((s: any) => (
                  <Link href={`/dashboard/lectures/${s.lecture_id}?slide=${s.slide_number}`} key={s.id}>
                    <div className="group bg-card border border-border hover:border-brand-purple/50 rounded-xl p-4 transition-all h-full flex flex-col cursor-pointer hover:shadow-lg hover:shadow-brand-purple/5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-medium text-brand-purple bg-brand-purple/10 px-2 py-1 rounded">Slide {s.slide_number}</div>
                      </div>
                      <div className="text-sm text-foreground line-clamp-3 mb-2 font-medium">
                        {s.text_content}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-auto">
                        {s.explanation}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Flashcards */}
          {results.flashcards?.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-500" /> Flashcards
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {results.flashcards.map((f: any) => (
                  <Link href={`/dashboard/flashcards?lecture=${f.lecture_id}`} key={f.id}>
                    <div className="group bg-card border border-border hover:border-blue-500/50 rounded-xl p-4 transition-all h-full flex flex-col cursor-pointer hover:shadow-lg hover:shadow-blue-500/5">
                      <div className="text-sm font-semibold mb-2">Q: {f.front}</div>
                      <div className="text-sm text-muted-foreground line-clamp-3 mt-auto">A: {f.back}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Past Papers */}
          {results.past_papers?.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Award className="w-5 h-5 text-green-500" /> Past Papers
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {results.past_papers.map((p: any) => (
                  <Link href={`/dashboard/past-papers/viewer/${p.past_paper_id}`} key={p.id}>
                    <div className="group bg-card border border-border hover:border-green-500/50 rounded-xl p-4 transition-all h-full flex flex-col cursor-pointer hover:shadow-lg hover:shadow-green-500/5">
                      <div className="text-sm font-medium text-foreground line-clamp-4">
                        {p.text_content}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {(!results.slides?.length && !results.flashcards?.length && !results.past_papers?.length) && (
            <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
              <p>No study materials found matching your query.</p>
            </div>
          )}

        </div>
      ) : null}
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-32 bg-muted/30 rounded-xl"></div>}>
      <SearchResultsContent />
    </Suspense>
  );
}
