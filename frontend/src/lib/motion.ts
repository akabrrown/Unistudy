'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

export const SPRING_SNAPPY = {
  type: 'spring' as const,
  stiffness: 450,
  damping: 32,
  mass: 0.8,
};

export const SPRING_FLUID = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 30,
  mass: 1,
};

export const SPRING_GENTLE = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 28,
  mass: 1,
};

export const EASE_OUT_EXPO = [0.23, 1, 0.32, 1] as const;

export const INSTANT_TRANSITION = { duration: 0 };

/**
 * Respects both OS prefers-reduced-motion and UniStudy Accessibility settings
 * (`html[data-reduced-motion="true"]`).
 */
export function useAppReducedMotion(): boolean {
  const osReduced = useReducedMotion();
  const [domReduced, setDomReduced] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const check = () => {
      setDomReduced(root.getAttribute('data-reduced-motion') === 'true');
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(root, { attributes: true, attributeFilter: ['data-reduced-motion'] });
    return () => observer.disconnect();
  }, []);

  return Boolean(osReduced || domReduced);
}
