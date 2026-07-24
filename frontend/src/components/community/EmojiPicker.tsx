'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Smile } from 'lucide-react';

const COMMON_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '💡', '💯', '🙌', '👀', '✨'];

export function EmojiPicker({ 
  onSelect, 
  children 
}: { 
  onSelect: (emoji: string) => void;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={children ? "" : "inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground"}>
        {children || <Smile className="w-5 h-5" />}
      </PopoverTrigger>
      <PopoverContent side="top" className="w-auto p-2" align="center">
        <div className="grid grid-cols-5 gap-1">
          {COMMON_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
              className="text-xl w-8 h-8 flex items-center justify-center hover:bg-muted rounded-md transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
