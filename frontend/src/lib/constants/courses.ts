export interface CourseColorOption {
  hex: string;
  name: string;
}

export const COURSE_COLORS: CourseColorOption[] = [
  { hex: '#5B2D8E', name: 'Royal Purple' },
  { hex: '#1D4ED8', name: 'Cobalt Blue' },
  { hex: '#0D9488', name: 'Deep Teal' },
  { hex: '#15803D', name: 'Emerald Forest' },
  { hex: '#D97706', name: 'Warm Amber' },
  { hex: '#EA580C', name: 'Burnt Terracotta' },
  { hex: '#BE123C', name: 'Deep Crimson' },
  { hex: '#4338CA', name: 'Deep Indigo' },
  { hex: '#0284C7', name: 'Ocean Cerulean' },
  { hex: '#475569', name: 'Slate Graphite' },
];

const LEGACY_COLOR_MAP: Record<string, string> = {
  '#7b4db5': '#4338CA', // Remap light purple to deep indigo
  '#9b72cf': '#0D9488', // Remap pale lavender to deep teal
  '#4caf50': '#15803D', // Remap light green to emerald forest
  '#ff5722': '#EA580C', // Remap neon orange to burnt terracotta
  '#e91e63': '#BE123C', // Remap hot pink to deep crimson
  '#0b57d0': '#1D4ED8', // Remap legacy blue to cobalt
};

export function resolveCourseColor(colour?: string | null): string {
  if (!colour) return COURSE_COLORS[0].hex;
  const normalized = colour.toLowerCase().trim();
  if (LEGACY_COLOR_MAP[normalized]) {
    return LEGACY_COLOR_MAP[normalized];
  }
  return colour;
}
