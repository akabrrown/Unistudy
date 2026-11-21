'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function SmartSearchBar() {
  const [query, setQuery] = useState('');
  const [isMac, setIsMac] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setIsMac(typeof window !== 'undefined' && navigator.platform.toUpperCase().includes('MAC'));

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length > 0) {
      router.push(`/dashboard/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form 
      onSubmit={handleSearch} 
      className="relative flex items-center w-full mx-auto group"
    >
      <div className="absolute left-3.5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200 pointer-events-none">
        <Search className="w-4 h-4" />
      </div>
      <input
        ref={inputRef}
        type="text"
        placeholder="Smart Search slides, past papers, courses..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full pl-10 pr-16 py-2.5 text-xs sm:text-sm bg-background/80 border border-border/80 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-foreground placeholder:text-muted-foreground hover:border-primary/40"
      />
      <div className="absolute right-3 flex items-center pointer-events-none">
        <kbd className="hidden sm:inline-flex items-center gap-0.5 font-mono text-[10px] font-semibold bg-muted/80 border border-border/80 px-1.5 py-0.5 rounded text-muted-foreground shadow-2xs">
          {isMac ? '⌘K' : 'Ctrl+K'}
        </kbd>
      </div>
    </form>
  );
}
