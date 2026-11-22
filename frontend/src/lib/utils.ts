import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAcademicLevel(year: string | number | null | undefined): string {
  if (!year && year !== 0) return 'Scholar'
  const num = typeof year === 'string' ? parseInt(year, 10) : Number(year)
  if (isNaN(num) || num <= 0) return 'Scholar'
  // In Ghana / West African collegiate standards (e.g. UPSA), years 1 to 6 correspond to Level 100 to Level 600
  if (num <= 6) return `Level ${num * 100}`
  return `Level ${num}`
}

