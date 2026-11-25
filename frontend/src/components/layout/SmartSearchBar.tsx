'use client';

import React, { useSyncExternalStore } from 'react';
import { Search } from 'lucide-react';
import { triggerCommandPalette } from '@/components/layout/CommandPaletteModal';

const emptySubscribe = () => () => {};
const getIsMac = () =>
  typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');

export default function SmartSearchBar() {
  const isMac = useSyncExternalStore(emptySubscribe, getIsMac, () => false);

  return (
    <button
      type="button"
      onClick={triggerCommandPalette}
      className="relative flex items-center justify-between w-full px-3 py-2 text-xs bg-muted/40 hover:bg-muted/70 border border-border/70 hover:border-[#D89A06]/50 rounded-xl transition-colors text-muted-foreground hover:text-foreground cursor-pointer active:scale-[0.99]"
    >
      <span className="flex items-center gap-2 min-w-0 truncate">
        <Search className="w-3.5 h-3.5 text-[#D89A06] shrink-0" />
        <span className="truncate">Search slides, papers...</span>
      </span>
      <kbd className="inline-flex items-center font-mono text-[10px] font-medium bg-background border border-border/80 px-1.5 py-0.5 rounded text-muted-foreground shrink-0 ml-2">
        {isMac ? '⌘K' : 'Ctrl+K'}
      </kbd>
    </button>
  );
}
