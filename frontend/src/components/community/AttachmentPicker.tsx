'use client';

import { useState } from 'react';
import { Paperclip, Image as ImageIcon, Book, Video } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function AttachmentPicker({ 
  onAttach 
}: { 
  onAttach: (type: 'image' | 'material' | 'youtube', payload: string) => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [youtubeModalOpen, setYoutubeModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const handleImageAttach = (e: React.FormEvent) => {
    e.preventDefault();
    if (imageUrl) {
      onAttach('image', imageUrl);
      setImageModalOpen(false);
      setImageUrl('');
    }
  };

  const handleYoutubeAttach = (e: React.FormEvent) => {
    e.preventDefault();
    if (youtubeUrl) {
      // Extract video ID from URL
      let videoId = youtubeUrl;
      const match = youtubeUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
      if (match) videoId = match[1];
      
      onAttach('youtube', videoId);
      setYoutubeModalOpen(false);
      setYoutubeUrl('');
    }
  };

  // For materials, we just send a mock payload for now to demonstrate the feature
  const handleMaterialAttach = () => {
    onAttach('material', 'mock-flashcard-deck-id');
    setPopoverOpen(false);
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground">
          <Paperclip className="w-5 h-5" />
        </PopoverTrigger>
        <PopoverContent side="top" className="w-48 p-2" align="start">
          <div className="flex flex-col space-y-1">
            <Button variant="ghost" className="justify-start text-sm h-8" onClick={() => { setPopoverOpen(false); setImageModalOpen(true); }}>
              <ImageIcon className="w-4 h-4 mr-2 text-blue-500" />
              Image URL
            </Button>
            <Button variant="ghost" className="justify-start text-sm h-8" onClick={() => { setPopoverOpen(false); setYoutubeModalOpen(true); }}>
              <Video className="w-4 h-4 mr-2 text-red-500" />
              YouTube Video
            </Button>
            <Button variant="ghost" className="justify-start text-sm h-8" onClick={handleMaterialAttach}>
              <Book className="w-4 h-4 mr-2 text-plum-500" />
              Study Material
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Attach Image</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleImageAttach} className="flex gap-2">
            <Input 
              placeholder="Paste image URL here..." 
              value={imageUrl} 
              onChange={(e) => setImageUrl(e.target.value)} 
            />
            <Button type="submit">Attach</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={youtubeModalOpen} onOpenChange={setYoutubeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Attach YouTube Video</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleYoutubeAttach} className="flex gap-2">
            <Input 
              placeholder="Paste YouTube link here..." 
              value={youtubeUrl} 
              onChange={(e) => setYoutubeUrl(e.target.value)} 
            />
            <Button type="submit">Attach</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
