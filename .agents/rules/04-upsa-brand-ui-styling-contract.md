# UPSA Brand UI & Styling Quality Contract

> **Universal Standard for Every Feature, Page, and Button in UniStudy**
> All UI deliverables must strictly reflect the official UPSA Brand Color Palette across both Light and Dark themes.

---

## 1. Official UPSA Brand Color Matrix

| Role | Hex Code | HSL Representation | Design Intent & Usage |
|---|---|---|---|
| **UPSA Deep Navy** | `#00004E` | `hsl(240 100% 15%)` | Primary brand authority, headers, primary buttons, active tabs, main text in light mode. |
| **UPSA Gold** | `#D89A06` | `hsl(42 95% 43%)` | Brand accent, focus rings, active pill borders, highlighted badges, secondary CTAs, trophy/medal accents. |
| **UPSA Pure White** | `#FFFFFF` | `hsl(0 0% 100%)` | Clean card surfaces, dialog backgrounds in light mode, primary button text on navy. |
| **UPSA Gold Subtle** | `#FEF8E7` | `hsl(43 90% 95%)` | Light mode badge wash, quote backgrounds, active state tinted fills. |
| **UPSA Navy Subtle** | `#F0F3F9` | `hsl(220 35% 96%)` | Light mode page background wash, subtle chip backgrounds. |
| **UPSA Midnight (Dark)**| `#040416` | `hsl(240 70% 5%)` | Dark mode page canvas background. |
| **UPSA Card (Dark)** | `#0A0A28` | `hsl(240 60% 10%)` | Dark mode elevated card surface. |

---

## 2. Standardized Component Styling Patterns

### Buttons
- **Primary CTA Button:**
  ```tsx
  className="h-9 px-4 rounded-lg bg-[#00004E] text-white hover:bg-[#00004E]/90 dark:bg-[#00004E] dark:hover:bg-[#00004E]/85 border border-[#D89A06]/50 shadow-xs font-semibold text-xs transition-colors cursor-pointer"
  ```
- **Gold Accent Button:**
  ```tsx
  className="h-9 px-4 rounded-lg bg-[#D89A06] text-[#00004E] hover:bg-[#D89A06]/90 border border-[#D89A06] shadow-xs font-bold text-xs transition-colors cursor-pointer"
  ```
- **Outline / Secondary Button:**
  ```tsx
  className="h-9 px-4 rounded-lg border border-border bg-card text-foreground hover:border-[#D89A06]/60 hover:bg-muted/40 text-xs font-medium transition-colors cursor-pointer"
  ```
- **Destructive Button:**
  ```tsx
  className="h-9 px-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-semibold transition-colors cursor-pointer"
  ```

### Badges, Pills & Tabs
- **Active Navigation Pill / Tab:**
  ```tsx
  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00004E] text-white border border-[#D89A06] shadow-xs ring-1 ring-[#D89A06]/30"
  ```
- **Inactive Pill / Tab:**
  ```tsx
  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-card text-muted-foreground border border-border hover:border-[#D89A06]/50 hover:text-foreground transition-colors cursor-pointer"
  ```
- **Gold Highlight Tag / Chip:**
  ```tsx
  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#FEF8E7] text-[#8C6404] dark:bg-[#00004E]/60 dark:text-[#D89A06] border border-[#D89A06]/35"
  ```

### Cards & Sections
- **Standard Card:**
  ```tsx
  className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs hover:border-[#D89A06]/40 transition-colors"
  ```
- **Hero / Highlight Card:**
  ```tsx
  className="rounded-2xl border-2 border-[#D89A06]/40 bg-gradient-to-br from-[#FEF8E7]/90 via-card to-[#F0F3F9] dark:from-[#00004E]/40 dark:via-card dark:to-card p-6 shadow-sm"
  ```

---

## 3. Mandatory Color Pre-Flight Checklist

Before emitting code or calling any task complete:
- [ ] **Contrast Check:** No dark text on dark backgrounds; no white text on light backgrounds.
- [ ] **Brand Identity:** Primary interactive elements utilize UPSA Deep Navy (`#00004E`) and Gold (`#D89A06`).
- [ ] **Dual-Theme Verification:** Element renders impeccably in both light mode (crisp ivory/white + navy) and dark mode (deep midnight navy + gold highlights).
- [ ] **Focus States:** Keyboard focus uses Gold ring (`focus-visible:ring-[#D89A06]`).
- [ ] **Zero AI Sparkles:** Lucide `Sparkles` icon is banned. Use semantic education icons (`Target`, `GraduationCap`, `BookOpen`, `Layers`, `FileText`, `Award`).
- [ ] **Zero Generic Gradients:** No purple-to-pink generic AI gradients.
