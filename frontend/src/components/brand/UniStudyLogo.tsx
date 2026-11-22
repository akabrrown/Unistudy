import React from 'react';

export type LogoVariant =
  | 'primary'
  | 'stacked'
  | 'icon'
  | 'wordmark'
  | 'reversed'
  | 'emblem'
  | 'realistic'
  | 'monochrome-black'
  | 'monochrome-white';

export interface UniStudyLogoProps {
  /** Logo layout variant */
  variant?: LogoVariant;
  /** Responsive theme mode: 'auto' automatically swaps light/dark SVG via CSS, or enforce 'light' / 'dark' */
  themeMode?: 'auto' | 'light' | 'dark';
  /** Height in pixels or standard sizing tier */
  height?: number | 'sm' | 'md' | 'lg' | 'xl';
  /** Optional class names applied to the container */
  className?: string;
  /** Whether to show the academic descriptor line */
  showSubtitle?: boolean;
  /** Alt tag for accessibility */
  alt?: string;
}

const HEIGHT_MAP = {
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
};

export const UniStudyLogo: React.FC<UniStudyLogoProps> = ({
  variant = 'primary',
  themeMode = 'auto',
  height = 'md',
  className = '',
  alt = 'UniStudy AI - UPSA Academic Excellence',
}) => {
  const numericHeight = typeof height === 'number' ? height : HEIGHT_MAP[height] || 36;

  // Render responsive auto-switching vector image if themeMode is 'auto'
  if (themeMode === 'auto') {
    if (variant === 'icon' || variant === 'emblem' || variant === 'realistic') {
      return (
        <span className={`inline-flex items-center shrink-0 ${className}`}>
          {/* Light Mode Icon */}
          <img
            src="/brand/logo-icon.svg"
            alt={alt}
            style={{ height: `${numericHeight}px`, width: 'auto' }}
            className="dark:hidden object-contain select-none"
          />
          {/* Dark Mode Icon */}
          <img
            src="/brand/logo-icon-reversed.svg"
            alt={alt}
            style={{ height: `${numericHeight}px`, width: 'auto' }}
            className="hidden dark:block object-contain select-none"
          />
        </span>
      );
    }

    if (variant === 'stacked') {
      return (
        <span className={`inline-flex items-center shrink-0 ${className}`}>
          <img
            src="/brand/logo-stacked.svg"
            alt={alt}
            style={{ height: `${numericHeight}px`, width: 'auto' }}
            className="dark:hidden object-contain select-none"
          />
          <img
            src="/brand/logo-stacked-reversed.svg"
            alt={alt}
            style={{ height: `${numericHeight}px`, width: 'auto' }}
            className="hidden dark:block object-contain select-none"
          />
        </span>
      );
    }

    if (variant === 'wordmark') {
      return (
        <span className={`inline-flex items-center shrink-0 ${className}`}>
          <img
            src="/brand/logo-wordmark.svg"
            alt={alt}
            style={{ height: `${numericHeight}px`, width: 'auto' }}
            className="dark:hidden object-contain select-none"
          />
          <img
            src="/brand/logo-wordmark-reversed.svg"
            alt={alt}
            style={{ height: `${numericHeight}px`, width: 'auto' }}
            className="hidden dark:block object-contain select-none"
          />
        </span>
      );
    }

    // Default: 'primary' horizontal logo
    return (
      <span className={`inline-flex items-center shrink-0 ${className}`}>
        <img
          src="/brand/logo-primary.svg"
          alt={alt}
          style={{ height: `${numericHeight}px`, width: 'auto' }}
          className="dark:hidden object-contain select-none"
        />
        <img
          src="/brand/logo-primary-reversed.svg"
          alt={alt}
          style={{ height: `${numericHeight}px`, width: 'auto' }}
          className="hidden dark:block object-contain select-none"
        />
      </span>
    );
  }

  // Explicit Theme Mode (light or dark)
  let src = '/brand/logo-primary.svg';
  if (variant === 'icon' || variant === 'emblem' || variant === 'realistic') {
    src = themeMode === 'dark' ? '/brand/logo-icon-reversed.svg' : '/brand/logo-icon.svg';
  } else if (variant === 'stacked') {
    src = themeMode === 'dark' ? '/brand/logo-stacked-reversed.svg' : '/brand/logo-stacked.svg';
  } else if (variant === 'wordmark') {
    src = themeMode === 'dark' ? '/brand/logo-wordmark-reversed.svg' : '/brand/logo-wordmark.svg';
  } else if (variant === 'reversed') {
    src = '/brand/logo-primary-reversed.svg';
  } else if (variant === 'monochrome-black') {
    src = '/brand/logo-primary-mono-black.svg';
  } else if (variant === 'monochrome-white') {
    src = '/brand/logo-primary-mono-white.svg';
  } else {
    src = themeMode === 'dark' ? '/brand/logo-primary-reversed.svg' : '/brand/logo-primary.svg';
  }

  return (
    <span className={`inline-flex items-center shrink-0 ${className}`}>
      <img
        src={src}
        alt={alt}
        style={{ height: `${numericHeight}px`, width: 'auto' }}
        className="object-contain select-none"
      />
    </span>
  );
};
