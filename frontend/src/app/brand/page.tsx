import React from 'react';
import { MarketingNavbar } from '@/components/layout/MarketingNavbar';
import { MarketingFooter } from '@/components/layout/MarketingFooter';
import { Download, Layers, Palette } from 'lucide-react';
import { InteractiveSwatchGrid, ClearSpaceBlueprint } from './BrandInteractiveKit';

export const metadata = {
  title: 'Brand Assets & Logo System | UniStudy AI',
  description: 'Official brand guidelines, vector logos, academic crests, and color palettes for UniStudy AI.',
};

const LOGO_SETS = [
  {
    id: 'primary',
    title: 'Primary Horizontal Logo',
    description: 'Standard lockup for web headers, academic documents, and official communications.',
    variants: [
      {
        label: 'Light Surface',
        bgClass: 'bg-white border border-border/80',
        textColor: 'text-[#00004E]',
        svgPath: '/brand/logo-primary.svg',
        pngPath: '/brand/logo-primary.png',
        dark: false,
      },
      {
        label: 'Reversed / Dark Surface',
        bgClass: 'bg-[#00004E] border border-[#D89A06]/30',
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
    description: 'Vertical composition for square containers, app icons, splash screens, and certificates.',
    variants: [
      {
        label: 'Light Surface',
        bgClass: 'bg-white border border-border/80',
        textColor: 'text-[#00004E]',
        svgPath: '/brand/logo-stacked.svg',
        pngPath: '/brand/logo-stacked.png',
        dark: false,
      },
      {
        label: 'Reversed / Dark Surface',
        bgClass: 'bg-[#00004E] border border-[#D89A06]/30',
        textColor: 'text-white',
        svgPath: '/brand/logo-stacked-reversed.svg',
        pngPath: '/brand/logo-stacked-reversed.png',
        dark: true,
      },
    ],
  },
  {
    id: 'icon',
    title: 'Academic Crest Monogram',
    description: 'Freestanding emblem uniting the mortarboard apex, U pillars, and central beacon.',
    variants: [
      {
        label: 'Full Color Crest',
        bgClass: 'bg-white border border-border/80',
        textColor: 'text-[#00004E]',
        svgPath: '/brand/logo-icon.svg',
        pngPath: '/brand/logo-icon.png',
        dark: false,
      },
      {
        label: 'Reversed Crest',
        bgClass: 'bg-[#00004E] border border-[#D89A06]/30',
        textColor: 'text-white',
        svgPath: '/brand/logo-icon-reversed.svg',
        pngPath: '/brand/logo-icon-reversed.png',
        dark: true,
      },
    ],
  },
  {
    id: 'wordmark',
    title: 'Wordmark Logotype',
    description: 'Typographic logotype for compact toolbars, narrow headers, and co-branded materials.',
    variants: [
      {
        label: 'Light Surface',
        bgClass: 'bg-white border border-border/80',
        textColor: 'text-[#00004E]',
        svgPath: '/brand/logo-wordmark.svg',
        pngPath: '/brand/logo-wordmark.png',
        dark: false,
      },
      {
        label: 'Reversed Surface',
        bgClass: 'bg-[#00004E] border border-[#D89A06]/30',
        textColor: 'text-white',
        svgPath: '/brand/logo-wordmark-reversed.svg',
        pngPath: '/brand/logo-wordmark-reversed.png',
        dark: true,
      },
    ],
  },
  {
    id: 'monochrome',
    title: 'Single-Tone Monochrome',
    description: 'Single-ink specifications for black-and-white examination headers, stamps, and engraving.',
    variants: [
      {
        label: 'Monochrome Black',
        bgClass: 'bg-white border border-border/80',
        textColor: 'text-[#00004E]',
        svgPath: '/brand/logo-primary-mono-black.svg',
        pngPath: '/brand/logo-primary-mono-black.png',
        dark: false,
      },
      {
        label: 'Monochrome White',
        bgClass: 'bg-[#0A0A14] border border-white/15',
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
    role: 'Primary Authority & Structural Headers',
    hex: '#00004E',
    rgb: 'rgb(0, 0, 78)',
    cmyk: '100 / 100 / 0 / 69',
    lightText: true,
  },
  {
    name: 'UPSA Heritage Gold',
    role: 'Active Accents, Focus Rings & Seals',
    hex: '#D89A06',
    rgb: 'rgb(216, 154, 6)',
    cmyk: '0 / 29 / 97 / 15',
    lightText: false,
  },
  {
    name: 'Gold Facet Highlight',
    role: 'Crest Bevel & Mortarboard Highlight',
    hex: '#F5B82E',
    rgb: 'rgb(245, 184, 46)',
    cmyk: '0 / 25 / 81 / 4',
    lightText: false,
  },
  {
    name: 'Gold Facet Shadow',
    role: 'Tassel & Emblem Depth Shading',
    hex: '#B88204',
    rgb: 'rgb(184, 130, 4)',
    cmyk: '0 / 29 / 98 / 28',
    lightText: true,
  },
  {
    name: 'Pure White',
    role: 'Light Surfaces & Reversed Typography',
    hex: '#FFFFFF',
    rgb: 'rgb(255, 255, 255)',
    cmyk: '0 / 0 / 0 / 0',
    lightText: false,
  },
  {
    name: 'Scholar Slate',
    role: 'Dark Theme Secondary Metadata',
    hex: '#A3A8C2',
    rgb: 'rgb(163, 168, 194)',
    cmyk: '16 / 13 / 0 / 24',
    lightText: false,
  },
];

export default function BrandPage() {
  return (
    <div className="min-h-[100dvh] bg-[#F8F9FD] dark:bg-[#040416] text-[#00004E] dark:text-white transition-colors">
      <MarketingNavbar />

      <main className="max-w-7xl mx-auto px-6 sm:px-8 py-16 md:py-20 space-y-16">
        <header className="max-w-3xl space-y-3.5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#00004E] dark:text-[#D89A06] border-l-2 border-[#D89A06] pl-3">
            Visual Identity &amp; Asset Kit
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#00004E] dark:text-white">
            UniStudy Brand System
          </h1>
          <p className="text-base md:text-lg text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed">
            Vector crests, wordmarks, click-to-copy color specifications, and clear-space geometry anchored in UPSA collegiate colors.
          </p>
        </header>

        {/* 5 Logo System Sections */}
        <div className="space-y-14">
          {LOGO_SETS.map((set, setIdx) => (
            <section key={set.id} className="space-y-5 pt-6 border-t border-border/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-[#00004E] text-[#D89A06] text-xs font-bold flex items-center justify-center font-mono">
                    0{setIdx + 1}
                  </span>
                  <h2 className="text-xl md:text-2xl font-bold text-[#00004E] dark:text-white">
                    {set.title}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground pl-8">{set.description}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 md:pl-8">
                {set.variants.map((variant) => (
                  <div
                    key={variant.label}
                    className={`rounded-2xl p-6 flex flex-col justify-between shadow-2xs ${variant.bgClass}`}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 mb-5">
                      <span className={`text-xs font-semibold ${variant.textColor}`}>
                        {variant.label}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/10 dark:bg-white/10">
                        SVG · PNG
                      </span>
                    </div>

                    <div className="py-8 flex items-center justify-center min-h-[130px]">
                      <img
                        src={variant.svgPath}
                        alt={`${set.title} (${variant.label})`}
                        className="max-h-20 max-w-full object-contain"
                      />
                    </div>

                    <div className="pt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-3">
                      <a
                        href={variant.svgPath}
                        download
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold bg-[#D89A06] text-[#00004E] hover:bg-[#C28905] transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        SVG
                      </a>
                      <a
                        href={variant.pngPath}
                        download
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          variant.dark
                            ? 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                            : 'bg-muted/60 text-[#00004E] border-border hover:bg-muted'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        PNG
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Interactive Click-to-Copy Color Swatches */}
        <section className="space-y-6 pt-10 border-t border-border/60">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-[#00004E] dark:text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#D89A06]" />
              Color Specifications (Click to Copy)
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Click any swatch or RGB code to copy the exact color token to your clipboard.
            </p>
          </div>

          <InteractiveSwatchGrid palette={BRAND_PALETTE} />
        </section>

        {/* Visual Clear-Space Blueprint & Scale Tester */}
        <section className="space-y-6 pt-10 border-t border-border/60">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-[#00004E] dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#D89A06]" />
              Clear Space &amp; Digital Scale
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Visual spacing geometry and minimum digital rendering heights.
            </p>
          </div>

          <ClearSpaceBlueprint />
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
