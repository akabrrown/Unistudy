import React from 'react';
import Link from 'next/link';
import { MarketingNavbar } from '@/components/layout/MarketingNavbar';
import { MarketingFooter } from '@/components/layout/MarketingFooter';
import { Download, Copy, CheckCircle2, Shield, Sparkles, Layers, Palette } from 'lucide-react';
import { UniStudyLogo } from '@/components/brand/UniStudyLogo';

export const metadata = {
  title: 'Brand Assets & Logo System | UniStudy AI',
  description: 'Official brand guidelines, vector logos, academic crests, and color palettes for UniStudy AI.',
};

const LOGO_SETS = [
  {
    id: 'primary',
    title: 'Primary Horizontal Logo',
    description: 'The standard and authoritative logo for web headers, documents, and corporate communications.',
    variants: [
      {
        label: 'Light Background (Standard)',
        bgClass: 'bg-white border-2 border-slate-200',
        textColor: 'text-slate-800',
        svgPath: '/brand/logo-primary.svg',
        pngPath: '/brand/logo-primary.png',
        dark: false,
      },
      {
        label: 'Reversed / Dark Surface',
        bgClass: 'bg-[#00004E] border-2 border-[#D89A06]/30',
        textColor: 'text-white',
        svgPath: '/brand/logo-primary-reversed.svg',
        pngPath: '/brand/logo-primary-reversed.png',
        dark: true,
      },
    ],
  },
  {
    id: 'stacked',
    title: 'Stacked Logo Lockup',
    description: 'Balanced vertical composition ideal for square containers, app store cards, splash screens, and certificates.',
    variants: [
      {
        label: 'Light Background',
        bgClass: 'bg-white border-2 border-slate-200',
        textColor: 'text-slate-800',
        svgPath: '/brand/logo-stacked.svg',
        pngPath: '/brand/logo-stacked.png',
        dark: false,
      },
      {
        label: 'Reversed / Dark Background',
        bgClass: 'bg-[#00004E] border-2 border-[#D89A06]/30',
        textColor: 'text-white',
        svgPath: '/brand/logo-stacked-reversed.svg',
        pngPath: '/brand/logo-stacked-reversed.png',
        dark: true,
      },
    ],
  },
  {
    id: 'icon',
    title: 'Icon Only (Academic Crest Monogram)',
    description: 'The iconic freestanding emblem uniting the mortarboard apex, monumental "U" pillars, and central starburst beacon.',
    variants: [
      {
        label: 'Full Color Icon',
        bgClass: 'bg-white border-2 border-slate-200',
        textColor: 'text-slate-800',
        svgPath: '/brand/logo-icon.svg',
        pngPath: '/brand/logo-icon.png',
        dark: false,
      },
      {
        label: 'Reversed Icon',
        bgClass: 'bg-[#00004E] border-2 border-[#D89A06]/30',
        textColor: 'text-white',
        svgPath: '/brand/logo-icon-reversed.svg',
        pngPath: '/brand/logo-icon-reversed.png',
        dark: true,
      },
    ],
  },
  {
    id: 'wordmark',
    title: 'Wordmark Only',
    description: 'Crisp typographic logotype for compact toolbars, narrow headers, and co-branded materials.',
    variants: [
      {
        label: 'Light Surface',
        bgClass: 'bg-white border-2 border-slate-200',
        textColor: 'text-slate-800',
        svgPath: '/brand/logo-wordmark.svg',
        pngPath: '/brand/logo-wordmark.png',
        dark: false,
      },
      {
        label: 'Reversed Surface',
        bgClass: 'bg-[#00004E] border-2 border-[#D89A06]/30',
        textColor: 'text-white',
        svgPath: '/brand/logo-wordmark-reversed.svg',
        pngPath: '/brand/logo-wordmark-reversed.png',
        dark: true,
      },
    ],
  },
  {
    id: 'monochrome',
    title: 'Monochrome (Single-Tone)',
    description: 'Pure single-color specifications for black-and-white printing, fax documents, stamps, and laser engraving.',
    variants: [
      {
        label: 'Monochrome Black (100% Black)',
        bgClass: 'bg-white border-2 border-slate-300',
        textColor: 'text-slate-800',
        svgPath: '/brand/logo-primary-mono-black.svg',
        pngPath: '/brand/logo-primary-mono-black.png',
        dark: false,
      },
      {
        label: 'Monochrome White (100% White)',
        bgClass: 'bg-black border-2 border-neutral-700',
        textColor: 'text-white',
        svgPath: '/brand/logo-primary-mono-white.svg',
        pngPath: '/brand/logo-primary-mono-white.png',
        dark: true,
      },
    ],
  },
];

const BRAND_PALETTE = [
  {
    name: 'UPSA Deep Navy',
    role: 'Primary Authority & Foundation',
    hex: '#00004E',
    rgb: 'rgb(0, 0, 78)',
    cmyk: '100 / 100 / 0 / 69',
    lightText: true,
  },
  {
    name: 'UPSA Heritage Gold',
    role: 'Apex Accent & Excellence',
    hex: '#D89A06',
    rgb: 'rgb(216, 154, 6)',
    cmyk: '0 / 29 / 97 / 15',
    lightText: false,
  },
  {
    name: 'Gold Light (Facet Highlight)',
    role: '3D Bevel & Mortarboard Glow',
    hex: '#F5B82E',
    rgb: 'rgb(245, 184, 46)',
    cmyk: '0 / 25 / 81 / 4',
    lightText: false,
  },
  {
    name: 'Gold Shadow (Facet Shadow)',
    role: 'Skullcap & Tassel Shading',
    hex: '#B88204',
    rgb: 'rgb(184, 130, 4)',
    cmyk: '0 / 29 / 98 / 28',
    lightText: true,
  },
  {
    name: 'Pure White',
    role: 'Reversed Surfaces & High Contrast',
    hex: '#FFFFFF',
    rgb: 'rgb(255, 255, 255)',
    cmyk: '0 / 0 / 0 / 0',
    lightText: false,
    border: true,
  },
  {
    name: 'Scholar Slate Dark',
    role: 'Dark Theme Secondary Text',
    hex: '#A3A8C2',
    rgb: 'rgb(163, 168, 194)',
    cmyk: '16 / 13 / 0 / 24',
    lightText: false,
  },
];

export default function BrandPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FD] dark:bg-[#040416] text-[#00004E] dark:text-white transition-colors">
      <MarketingNavbar />

      <main className="max-w-7xl mx-auto px-6 sm:px-8 py-12 md:py-20 space-y-16">
        {/* Header Hero */}
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FEF8E7] dark:bg-[#00004E] border border-[#D89A06] text-[#00004E] dark:text-[#D89A06] text-xs font-bold uppercase tracking-wider">
            <Palette className="w-3.5 h-3.5 text-[#D89A06]" />
            Official Visual Identity Guidelines
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#00004E] dark:text-white">
            UniStudy AI Logo System
          </h1>
          <p className="text-base md:text-lg text-[#5A6484] dark:text-[#A3A8C2] leading-relaxed">
            The authoritative identity of UniStudy AI. Anchored in the heritage of the University of Professional Studies, Accra (UPSA), uniting academic prestige with algorithmic precision.
          </p>
        </section>

        {/* 6 Logo System Sections */}
        <div className="space-y-16">
          {LOGO_SETS.map((set, setIdx) => (
            <section key={set.id} className="space-y-6 pt-6 border-t border-[#D89A06]/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#00004E] text-[#D89A06] text-xs font-black flex items-center justify-center font-mono border border-[#D89A06]/40">
                    {setIdx + 1}
                  </span>
                  <h2 className="text-2xl font-black text-[#00004E] dark:text-white">
                    {set.title}
                  </h2>
                </div>
                <p className="text-sm text-[#5A6484] dark:text-[#A3A8C2] pl-8.5">
                  {set.description}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 pl-0 md:pl-8.5">
                {set.variants.map((variant) => (
                  <div
                    key={variant.label}
                    className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xs ${variant.bgClass}`}
                  >
                    <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10 mb-6">
                      <span className={`text-xs font-bold uppercase tracking-wider ${variant.textColor}`}>
                        {variant.label}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/10 dark:bg-white/10 font-bold">
                        SVG + PNG
                      </span>
                    </div>

                    {/* Logo Graphic Render */}
                    <div className="py-8 flex items-center justify-center min-h-[140px]">
                      <img
                        src={variant.svgPath}
                        alt={`${set.title} - ${variant.label}`}
                        className="max-h-24 max-w-full object-contain"
                      />
                    </div>

                    {/* Download Bar */}
                    <div className="pt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-3">
                      <a
                        href={variant.svgPath}
                        download
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#D89A06] text-[#00004E] hover:bg-[#C28905] transition-all shadow-xs cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download SVG
                      </a>
                      <a
                        href={variant.pngPath}
                        download
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          variant.dark
                            ? 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                            : 'bg-slate-100 text-[#00004E] border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download PNG
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Brand Color Specifications */}
        <section className="space-y-6 pt-10 border-t-2 border-[#D89A06]">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-[#00004E] dark:text-white flex items-center gap-2">
              <Palette className="w-6 h-6 text-[#D89A06]" />
              Official Brand Color Specifications
            </h2>
            <p className="text-sm text-[#5A6484] dark:text-[#A3A8C2]">
              Strictly adhered to across all website interfaces, mobile application themes, and official communication.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BRAND_PALETTE.map((c) => (
              <div
                key={c.hex}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0A28] overflow-hidden shadow-xs"
              >
                <div
                  className="h-28 w-full p-4 flex flex-col justify-end"
                  style={{ backgroundColor: c.hex }}
                >
                  <span
                    className={`font-mono text-xs font-black uppercase tracking-wider ${
                      c.lightText ? 'text-white' : 'text-[#00004E]'
                    }`}
                  >
                    {c.hex}
                  </span>
                </div>
                <div className="p-5 space-y-2">
                  <h3 className="font-bold text-[#00004E] dark:text-white text-base">
                    {c.name}
                  </h3>
                  <p className="text-xs text-[#5A6484] dark:text-[#A3A8C2]">
                    {c.role}
                  </p>
                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 font-mono text-[11px] text-slate-500 space-y-0.5">
                    <div>RGB: {c.rgb}</div>
                    <div>CMYK: {c.cmyk}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Clear Space & Minimum Sizing Rules */}
        <section className="space-y-6 pt-10 border-t border-[#D89A06]/20">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-[#00004E] dark:text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-[#D89A06]" />
              Clear Space &amp; Minimum Scale Rules
            </h2>
            <p className="text-sm text-[#5A6484] dark:text-[#A3A8C2]">
              Maintain visual dignity and authority by enforcing adequate breathing room around the logo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0A0A28] border border-slate-200 dark:border-white/10 space-y-3">
              <h3 className="font-bold text-[#00004E] dark:text-white text-base">
                Clear Space Formula
              </h3>
              <p className="text-sm text-[#5A6484] dark:text-[#A3A8C2] leading-relaxed">
                The minimum clear zone on all four sides of any logo variant must be equal to or greater than the height of the Mortarboard Apex diamond (<code className="text-[#D89A06] font-mono">0.5X</code>).
              </p>
              <ul className="text-xs text-[#5A6484] dark:text-[#A3A8C2] space-y-1.5 list-disc pl-4">
                <li>Never place typography or busy patterns inside the clear boundary.</li>
                <li>Do not add artificial drop shadows, glows, or bevel strokes.</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#0A0A28] border border-slate-200 dark:border-white/10 space-y-3">
              <h3 className="font-bold text-[#00004E] dark:text-white text-base">
                Minimum Digital Scales
              </h3>
              <div className="space-y-2 text-sm text-[#5A6484] dark:text-[#A3A8C2]">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                  <span className="font-medium text-[#00004E] dark:text-white">Primary Horizontal</span>
                  <span className="font-mono text-xs">Min height: 28px</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                  <span className="font-medium text-[#00004E] dark:text-white">Stacked Lockup</span>
                  <span className="font-mono text-xs">Min height: 64px</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-medium text-[#00004E] dark:text-white">Icon Only</span>
                  <span className="font-mono text-xs">Min size: 16px (Favicon)</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
