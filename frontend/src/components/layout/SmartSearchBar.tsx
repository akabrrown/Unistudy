'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function SmartSearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

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
      <div className="absolute left-4 text-muted-foreground group-focus-within:text-brand-purple transition-colors duration-300">
        <Search className="w-[18px] h-[18px]" />
      </div>
      <input
        type="text"
        placeholder="Smart Search slides, flashcards, papers..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full pl-12 pr-4 py-3 text-sm bg-background border border-border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple transition-all duration-300 text-foreground placeholder:text-muted-foreground hover:border-brand-purple/50"
      />
    </form>
  );
}
