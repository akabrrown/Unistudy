/**
 * Slide Image Optimization & CDN Delivery Utilities
 * Converts raw Cloudinary URLs to modern, compressed, responsive assets,
 * preserves multi-page PDF page indices (pg_N), and reliably rejects broken placeholder URLs.
 */

export interface SlideImageOptions {
  width?: number;
  quality?: 'auto' | 'good' | 'eco' | 'low';
  lowBandwidth?: boolean;
}

/**
 * Checks if a given slide URL is empty, an imaginary domain, or a known broken placeholder.
 */
export function isPlaceholderSlideUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (trimmed === '' || trimmed === 'https://example.com/placeholder.png') return true;
  
  // Rejects known dead placeholder or test cloud names
  if (trimmed.includes('dwyxspqbe') || trimmed.includes('placeholder')) {
    return true;
  }

  // Must be a valid http or https URL
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return true;
  }

  return false;
}

/**
 * Transforms a slide image URL with optimal Cloudinary CDN delivery parameters.
 * Automatically preserves page indices (`pg_N`) and converts raw uploads to image uploads.
 */
export function getOptimizedSlideUrl(
  url: string | null | undefined,
  options: SlideImageOptions = {}
): string {
  if (isPlaceholderSlideUrl(url)) return '';
  const cleanUrl = url!.trim();

  // If it's a Cloudinary URL, format transformations properly
  if (cleanUrl.includes('res.cloudinary.com')) {
    // Cloudinary PDF-to-image extraction requires the 'image' resource type, not 'raw'
    let normalizedUrl = cleanUrl.replace('/raw/upload/', '/image/upload/');

    const isLow = Boolean(options.lowBandwidth);
    const width = options.width || (isLow ? 1000 : 1600);
    const quality = options.quality ? `q_auto:${options.quality}` : (isLow ? 'q_auto:eco' : 'q_auto:good');
    const format = 'f_auto';

    // Extract any existing page number parameter (e.g. pg_1, pg_46)
    const pageMatch = normalizedUrl.match(/pg_(\d+)/);
    const pageParam = pageMatch ? `${pageMatch[0]},` : '';

    const transformation = `${pageParam}${format},${quality},w_${width},c_limit`;

    // Replace existing transformation if present, or insert fresh after /upload/
    if (/\/upload\/[^/]+\//.test(normalizedUrl) && (normalizedUrl.includes('/upload/pg_') || normalizedUrl.includes('/upload/f_') || normalizedUrl.includes('/upload/q_') || normalizedUrl.includes('/upload/w_'))) {
      return normalizedUrl.replace(/\/upload\/[^/]+\//, `/upload/${transformation}/`);
    }

    return normalizedUrl.replace('/upload/', `/upload/${transformation}/`);
  }

  return cleanUrl;
}

/**
 * Returns an ultra-lightweight micro-thumbnail (~3-6KB) for the slide preview strip,
 * preserving page indices (`pg_N`).
 */
export function getSlideThumbnailUrl(url: string | null | undefined): string {
  if (isPlaceholderSlideUrl(url)) return '';
  const cleanUrl = url!.trim();

  if (cleanUrl.includes('res.cloudinary.com')) {
    let normalizedUrl = cleanUrl.replace('/raw/upload/', '/image/upload/');

    const pageMatch = normalizedUrl.match(/pg_(\d+)/);
    const pageParam = pageMatch ? `${pageMatch[0]},` : '';

    const transformation = `${pageParam}f_auto,q_auto:eco,w_180,h_100,c_fill`;

    if (/\/upload\/[^/]+\//.test(normalizedUrl) && (normalizedUrl.includes('/upload/pg_') || normalizedUrl.includes('/upload/f_') || normalizedUrl.includes('/upload/q_') || normalizedUrl.includes('/upload/w_'))) {
      return normalizedUrl.replace(/\/upload\/[^/]+\//, `/upload/${transformation}/`);
    }

    return normalizedUrl.replace('/upload/', `/upload/${transformation}/`);
  }

  return cleanUrl;
}

/**
 * Returns a tiny blurred placeholder (~1KB) for smooth progressive loading.
 */
export function getSlideBlurPlaceholder(url: string | null | undefined): string {
  if (isPlaceholderSlideUrl(url)) return '';
  const cleanUrl = url!.trim();

  if (cleanUrl.includes('res.cloudinary.com')) {
    let normalizedUrl = cleanUrl.replace('/raw/upload/', '/image/upload/');

    const pageMatch = normalizedUrl.match(/pg_(\d+)/);
    const pageParam = pageMatch ? `${pageMatch[0]},` : '';

    const transformation = `${pageParam}f_auto,q_auto:low,w_40,e_blur:1000`;

    if (/\/upload\/[^/]+\//.test(normalizedUrl) && (normalizedUrl.includes('/upload/pg_') || normalizedUrl.includes('/upload/f_') || normalizedUrl.includes('/upload/q_') || normalizedUrl.includes('/upload/w_'))) {
      return normalizedUrl.replace(/\/upload\/[^/]+\//, `/upload/${transformation}/`);
    }

    return normalizedUrl.replace('/upload/', `/upload/${transformation}/`);
  }

  return cleanUrl;
}
