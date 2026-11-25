'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { UniStudyLogo } from '@/components/brand/UniStudyLogo';

export interface SwatchItem {
  name: string;
  role: string;
  hex: string;
  rgb: string;
  cmyk: string;
  lightText: boolean;
}

export function InteractiveSwatchGrid({ palette }: { palette: SwatchItem[] }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyValue = async (val: string, label: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedKey(`${label}-${val}`);
      toast.success(`Copied ${val}`);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      toast.error('Clipboard copy failed');
    }
  };

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {palette.map((c) => {
        const hexCopied = copiedKey === `hex-${c.hex}`;
        const rgbCopied = copiedKey === `rgb-${c.rgb}`;
        return (
          <div
            key={c.hex}
            className="rounded-2xl border border-border/80 bg-white dark:bg-[#0A0A28] overflow-hidden shadow-2xs group"
          >
            <button
              type="button"
              onClick={() => copyValue(c.hex, 'hex')}
              className="h-28 w-full p-4 flex items-end justify-between text-left cursor-pointer transition-opacity hover:opacity-95"
              style={{ backgroundColor: c.hex }}
            >
              <span
                className={`font-mono text-xs font-bold uppercase tracking-wider ${
                  c.lightText ? 'text-white' : 'text-[#00004E]'
                }`}
              >
                {c.hex}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded ${
                  c.lightText ? 'bg-white/15 text-white' : 'bg-[#00004E]/10 text-[#00004E]'
                }`}
              >
                {hexCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{hexCopied ? 'Copied' : 'Copy HEX'}</span>
              </span>
            </button>

            <div className="p-5 space-y-2">
              <h3 className="font-bold text-[#00004E] dark:text-white text-sm">{c.name}</h3>
              <p className="text-xs text-muted-foreground">{c.role}</p>
              <div className="pt-2.5 border-t border-border/60 font-mono text-[11px] text-muted-foreground space-y-1">
                <button
                  type="button"
                  onClick={() => copyValue(c.rgb, 'rgb')}
                  className="w-full flex items-center justify-between hover:text-foreground cursor-pointer"
                >
                  <span>RGB: {c.rgb}</span>
                  {rgbCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-50" />}
                </button>
                <div>CMYK: {c.cmyk}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ClearSpaceBlueprint() {
  const [scalePx, setScalePx] = useState<20 | 32 | 56>(32);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Visual 0.5X Clear-Space Diagram */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0A0A28] border border-border/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#00004E] dark:text-white text-sm">
            0.5X Clear-Space Blueprint
          </h3>
          <span className="font-mono text-[11px] text-[#D89A06] font-semibold">Padding ≥ 0.5X</span>
        </div>

        <div className="rounded-xl border border-border/70 bg-[#F8F9FD] dark:bg-[#040416] p-6 flex items-center justify-center">
          <div className="relative p-6 border border-dashed border-[#D89A06] rounded-lg bg-white/60 dark:bg-white/[0.03]">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 bg-[#F8F9FD] dark:bg-[#040416] font-mono text-[10px] text-[#D89A06] font-bold">
              0.5X
            </span>
            <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-1.5 bg-[#F8F9FD] dark:bg-[#040416] font-mono text-[10px] text-[#D89A06] font-bold">
              0.5X
            </span>
            <span className="absolute top-1/2 -left-4 -translate-y-1/2 px-1 bg-[#F8F9FD] dark:bg-[#040416] font-mono text-[10px] text-[#D89A06] font-bold">
              0.5X
            </span>
            <span className="absolute top-1/2 -right-4 -translate-y-1/2 px-1 bg-[#F8F9FD] dark:bg-[#040416] font-mono text-[10px] text-[#D89A06] font-bold">
              0.5X
            </span>
            <div className="border border-border/60 px-4 py-2 rounded bg-white dark:bg-[#0A0A28]">
              <UniStudyLogo height={34} />
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Keep a minimum clear margin of <code className="font-mono text-[#00004E] dark:text-[#D89A06]">0.5X</code> (half the crest height) free of surrounding text, borders, or busy imagery.
        </p>
      </div>

      {/* Interactive Scale Preview */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0A0A28] border border-border/80 flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#00004E] dark:text-white text-sm">
            Live Digital Scale Tester
          </h3>
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-[11px] font-mono">
            {([20, 32, 56] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setScalePx(sz)}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  scalePx === sz
                    ? 'bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {sz}px
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-[#F8F9FD] dark:bg-[#040416] h-32 flex items-center justify-center px-4">
          <UniStudyLogo variant={scalePx === 20 ? 'icon' : 'primary'} height={scalePx} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/60">
          <div>Favicon: ≥16px</div>
          <div>Navbar: ≥28px</div>
          <div>Stacked: ≥64px</div>
        </div>
      </div>
    </div>
  );
}
