'use client';

// src/app/(auth)/signup/components/AvatarSelector.tsx
import React, { useState } from 'react';
import { Camera } from 'lucide-react';

export function AvatarSelector() {
  const [preset, setPreset] = useState('preset');
  const [url, setUrl] = useState('');

  const presets = [
    'https://randomuser.me/api/portraits/men/32.jpg', 
    'https://randomuser.me/api/portraits/women/44.jpg', 
    'https://randomuser.me/api/portraits/men/46.jpg',
    'https://randomuser.me/api/portraits/women/68.jpg',
    'https://randomuser.me/api/portraits/men/22.jpg',
    'https://randomuser.me/api/portraits/women/90.jpg'
  ];

  const handlePreset = (src: string) => {
    setPreset('preset');
    setUrl(src);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreset('upload');
      setUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Avatar</label>
      <div className="flex items-center gap-4">
        {presets.map((src) => (
          <button
            key={src}
            type="button"
            className={`border-2 rounded-full p-1 ${url === src ? 'border-primary' : 'border-muted'}`}
            onClick={() => handlePreset(src)}
          >
            <img src={src} alt="preset avatar" className="h-12 w-12 rounded-full" />
          </button>
        ))}
        <label className="flex items-center cursor-pointer">
          <Camera className="h-5 w-5 mr-1" />
          <span className="text-sm">Upload</span>
          <input type="file" name="avatarFile" accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
      </div>
      <input type="hidden" name="avatar_type" value={preset} />
      <input type="hidden" name="avatar_url" value={url} />
    </div>
  );
}
