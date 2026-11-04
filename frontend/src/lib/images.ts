/**
 * Slide Image Optimization & CDN Delivery Utilities
 * Converts raw Cloudinary URLs to modern, compressed, responsive assets.
 */

export interface SlideImageOptions {
  width?: number;
  quality?: 'auto' | 'good' | 'eco' | 'low';
  lowBandwidth?: boolean;
}

/**
 * Transforms a slide image URL with optimal Cloudinary CDN delivery parameters.
 * Automatically serves modern formats (WebP/AVIF) and perceptual quality compression.
 */
export function getOptimizedSlideUrl(
  url: string | null | undefined,
  options: SlideImageOptions = {}
): string {
  if (!url || typeof url !== 'string') return '';
  if (url === 'https://example.com/placeholder.png') return url;

  // Only apply Cloudinary transformations if it's a Cloudinary URL
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    const isLow = Boolean(options.lowBandwidth);
    const width = options.width || (isLow ? 1000 : 1600);
    const quality = options.quality ? `q_auto:${options.quality}` : (isLow ? 'q_auto:eco' : 'q_auto:good');
    const format = 'f_auto';

    const transformation = `${format},${quality},w_${width},c_limit`;

    // Replace existing transformation if present, or insert fresh
    if (url.includes('/upload/f_auto') || url.includes('/upload/q_')) {
      return url.replace(/\/upload\/[^/]+\//, `/upload/${transformation}/`);
    }

    return url.replace('/upload/', `/upload/${transformation}/`);
  }

  return url;
}

/**
 * Returns an ultra-lightweight micro-thumbnail (~3-6KB) for the slide preview strip.
 */
export function getSlideThumbnailUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  if (url === 'https://example.com/placeholder.png') return url;

  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    const transformation = 'f_auto,q_auto:eco,w_180,h_100,c_fill';
    if (url.includes('/upload/f_auto') || url.includes('/upload/q_')) {
      return url.replace(/\/upload\/[^/]+\//, `/upload/${transformation}/`);
    }
    return url.replace('/upload/', `/upload/${transformation}/`);
  }

  return url;
}

/**
 * Returns a tiny blurred placeholder (~1KB) for smooth progressive loading.
 */
export function getSlideBlurPlaceholder(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  if (url === 'https://example.com/placeholder.png') return url;

  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    const transformation = 'f_auto,q_auto:low,w_40,e_blur:1000';
    if (url.includes('/upload/f_auto') || url.includes('/upload/q_')) {
      return url.replace(/\/upload\/[^/]+\//, `/upload/${transformation}/`);
    }
    return url.replace('/upload/', `/upload/${transformation}/`);
  }

  return url;
}

