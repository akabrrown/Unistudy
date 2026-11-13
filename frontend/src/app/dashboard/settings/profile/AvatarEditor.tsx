'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function buildMonogramSvgDataUri(letter: string, bgHex: string, accentHex: string): string {
  const safeChar = (letter || 'U').charAt(0).toUpperCase().replace(/[^A-Z0-9]/g, 'U');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <rect width="160" height="160" rx="80" fill="${bgHex}"/>
    <circle cx="128" cy="32" r="44" fill="${accentHex}" fill-opacity="0.22"/>
    <circle cx="28" cy="132" r="36" fill="${accentHex}" fill-opacity="0.16"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="68" font-weight="700">${safeChar}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const AVATAR_PRESETS = [
  { id: 'emerald', label: 'Emerald Scholar', bg: '#065f46', accent: '#34d399' },
  { id: 'indigo', label: 'Indigo Fellow', bg: '#3730a3', accent: '#818cf8' },
  { id: 'amber', label: 'Amber Laureate', bg: '#92400e', accent: '#fbbf24' },
  { id: 'crimson', label: 'Crimson Dean', bg: '#991b1b', accent: '#f87171' },
  { id: 'teal', label: 'Teal Researcher', bg: '#115e59', accent: '#2dd4bf' },
  { id: 'slate', label: 'Obsidian Architect', bg: '#1e293b', accent: '#94a3b8' },
];

export function AvatarEditor({
  initialUrl,
  initialName,
  onAvatarChanged,
}: {
  initialUrl?: string | null;
  initialName?: string | null;
  onAvatarChanged?: (newUrl: string) => void;
}) {
  const [avatarUrl, setAvatarUrl] = useState(initialUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const initialLetter = (initialName || 'U').trim().charAt(0).toUpperCase() || 'U';

  async function saveAvatarToProfile(newUrl: string, avatarType: 'custom' | 'preset') {
    const res = await fetch('/api/profile/avatar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: newUrl, avatar_type: avatarType }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || 'Failed to save avatar');
    }
    setAvatarUrl(newUrl);
    onAvatarChanged?.(newUrl);
    router.refresh();
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      if (file.size > 4 * 1024 * 1024) {
        toast.error('Image must be smaller than 4 MB.');
        return;
      }

      setIsUploading(true);
      const fileExt = (file.name.split('.').pop() || 'png').toLowerCase();
      const filePath = `avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await saveAvatarToProfile(data.publicUrl, 'custom');
      toast.success('Profile photo updated');
    } catch (error: unknown) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not upload image. Try selecting one of the academic monogram badges below.'
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSelectPreset(bg: string, accent: string, label: string) {
    setIsUploading(true);
    try {
      const uri = buildMonogramSvgDataUri(initialLetter, bg, accent);
      await saveAvatarToProfile(uri, 'preset');
      toast.success(`Applied ${label} monogram`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to apply avatar preset');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={initialName || 'Scholar Avatar'}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/30 shadow-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-primary text-3xl font-bold font-mono shadow-md">
              {initialLetter}
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 rounded-2xl backdrop-blur-xs">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-foreground">
              {initialName || 'University Scholar'}
            </h4>
            <span className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-primary uppercase">
              Identity Badge
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Upload a custom square portrait (PNG/JPG ≤ 4 MB) or choose a scholarly monogram.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              className="hidden"
              onChange={(e) => void uploadAvatar(e)}
              disabled={isUploading}
            />
            <button
              type="button"
              onClick={() => document.getElementById('avatar-upload')?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              {isUploading ? 'Updating...' : 'Upload Portrait'}
            </button>
          </div>
        </div>
      </div>

      {/* Monogram Presets */}
      <div className="space-y-1.5 sm:border-l sm:border-border/70 sm:pl-4">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          Academic Monograms
        </span>
        <div className="flex items-center gap-1.5">
          {AVATAR_PRESETS.map((preset) => {
            const uri = buildMonogramSvgDataUri(initialLetter, preset.bg, preset.accent);
            const isSelected = avatarUrl === uri;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={isUploading}
                onClick={() => void handleSelectPreset(preset.bg, preset.accent, preset.label)}
                title={preset.label}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-white font-mono text-xs font-bold transition-transform hover:scale-105 cursor-pointer border',
                  isSelected ? 'ring-2 ring-primary border-white' : 'border-white/20'
                )}
                style={{ backgroundColor: preset.bg }}
              >
                {isSelected ? <Check className="w-3.5 h-3.5" /> : initialLetter}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
