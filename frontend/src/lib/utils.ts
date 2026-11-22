import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatAcademicLevel as formatAcademicLevelCanonical } from "@/lib/constants/upsa"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAcademicLevel(
  year: string | number | null | undefined,
  programmeName?: string | null
): string {
  return formatAcademicLevelCanonical(year, programmeName)
}


