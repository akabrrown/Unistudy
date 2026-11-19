export interface CourseColorOption {
  hex: string;
  name: string;
}

export const COURSE_COLORS: CourseColorOption[] = [
  { hex: '#00004E', name: 'UPSA Navy Blue' },
  { hex: '#D89A06', name: 'UPSA Gold' },
  { hex: '#1D4ED8', name: 'Cobalt Blue' },
  { hex: '#0D9488', name: 'Deep Teal' },
  { hex: '#15803D', name: 'Emerald Forest' },
  { hex: '#D97706', name: 'Warm Amber' },
  { hex: '#EA580C', name: 'Burnt Terracotta' },
  { hex: '#BE123C', name: 'Deep Crimson' },
  { hex: '#0284C7', name: 'Ocean Cerulean' },
  { hex: '#475569', name: 'Slate Graphite' },
];

const LEGACY_COLOR_MAP: Record<string, string> = {
  '#5b2d8e': '#00004E', // Remap legacy royal purple to UPSA Navy
  '#3d1a6e': '#00004E', // Remap legacy dark plum to UPSA Navy
  '#7b4db5': '#D89A06', // Remap legacy light purple to UPSA Gold
  '#9b72cf': '#D89A06', // Remap legacy pale lavender to UPSA Gold
  '#4338ca': '#00004E', // Remap legacy indigo to UPSA Navy
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
