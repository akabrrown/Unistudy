import zlib from 'zlib';
import path from 'path';
import posixPath from 'path/posix';
import { v2 as cloudinary } from 'cloudinary';
import { supabaseAdmin } from '../lib/supabase';
import { env } from '../config/env';
import { isRenderableSlideImage } from '../../../shared/lib/slideDedupe';

export interface ParsedPptxSlide {
  slide_number: number;
  raw_text: string;
  paragraphs: string[];
  title: string;
  slide_w: number;
  slide_h: number;
  images: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    mime: string;
    base64: string;
  }>;
  bg_hex?: string;
}

const EMU_PER_PT = 12700;

/**
 * Reads a ZIP archive via its Central Directory so entries using streaming data descriptors are parsed accurately.
 */
export function extractZipEntries(buffer: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();
  const minEocdOffset = Math.max(0, buffer.length - 65557);
  let eocdOffset = -1;

  for (let i = buffer.length - 22; i >= minEocdOffset; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('Invalid PPTX archive: End of Central Directory not found');
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
  let cursor = cdOffset;

  for (let n = 0; n < totalEntries && cursor + 46 <= buffer.length; n++) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) break;

    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLen = buffer.readUInt16LE(cursor + 28);
    const extraLen = buffer.readUInt16LE(cursor + 30);
    const commentLen = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);

    const name = buffer.toString('utf8', cursor + 46, cursor + 46 + fileNameLen);
    cursor += 46 + fileNameLen + extraLen + commentLen;

    if (name.endsWith('/') || localHeaderOffset + 30 > buffer.length) continue;
    if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) continue;

    const lhNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
    const lhExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + lhNameLen + lhExtraLen;
    const dataEnd = Math.min(buffer.length, dataStart + compressedSize);
    const slice = buffer.subarray(dataStart, dataEnd);

    try {
      if (method === 0) {
        entries.set(name, Buffer.from(slice));
      } else if (method === 8) {
        entries.set(name, zlib.inflateRawSync(slice));
      }
    } catch {
      // Skip malformed entry instead of failing the entire presentation
    }
  }

  return entries;
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&amp;/g, '&');
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function extractParagraphsFromXml(xml: string): string[] {
  const paragraphs: string[] = [];
  const pRegex = /<a:p(?:\s[^>]*)?>([\s\S]*?)<\/a:p>/g;
  const tRegex = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g;

  let pMatch: RegExpExecArray | null;
  while ((pMatch = pRegex.exec(xml)) !== null) {
    const pBody = pMatch[1];
    let combined = '';
    let tMatch: RegExpExecArray | null;
    tRegex.lastIndex = 0;
    while ((tMatch = tRegex.exec(pBody)) !== null) {
      combined += decodeXmlEntities(tMatch[1]);
    }
    const normalized = combined.replace(/\s+/g, ' ').trim();
    if (normalized) {
      paragraphs.push(normalized);
    }
  }

  if (paragraphs.length === 0) {
    let fallback = '';
    let tMatch: RegExpExecArray | null;
    tRegex.lastIndex = 0;
    while ((tMatch = tRegex.exec(xml)) !== null) {
      fallback += decodeXmlEntities(tMatch[1]);
    }
    const normalized = fallback.replace(/\s+/g, ' ').trim();
    if (normalized) {
      paragraphs.push(normalized);
    }
  }

  return paragraphs;
}

function parseRelsMap(entries: Map<string, Buffer>, slideXmlPath: string): Map<string, string> {
  const relsMap = new Map<string, string>();
  const dir = posixPath.dirname(slideXmlPath);
  const relsPath = posixPath.join(dir, '_rels', `${posixPath.basename(slideXmlPath)}.rels`);
  const relsBuf = entries.get(relsPath);
  if (!relsBuf) return relsMap;

  const xml = relsBuf.toString('utf8');
  const relTagRegex = /<Relationship\b([^>]+)\/?\s*>/g;
  let m: RegExpExecArray | null;
  while ((m = relTagRegex.exec(xml)) !== null) {
    const attrs = m[1];
    const idMatch = attrs.match(/\bId="([^"]+)"/);
    const targetMatch = attrs.match(/\bTarget="([^"]+)"/);
    if (!idMatch || !targetMatch) continue;
    const rawTarget = targetMatch[1];
    const resolved = rawTarget.startsWith('/')
      ? rawTarget.slice(1)
      : posixPath.normalize(posixPath.join(dir, rawTarget));
    relsMap.set(idMatch[1], resolved);
  }
  return relsMap;
}

function mimeForImagePath(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  return null;
}

function extractEmbeddedPictures(
  xml: string,
  relsMap: Map<string, string>,
  entries: Map<string, Buffer>
): ParsedPptxSlide['images'] {
  const images: ParsedPptxSlide['images'] = [];
  const picRegex = /<p:pic\b[\s\S]*?<\/p:pic>/g;
  let m: RegExpExecArray | null;

  while ((m = picRegex.exec(xml)) !== null) {
    const picBlock = m[0];
    const embedMatch = picBlock.match(/r:embed="([^"]+)"/);
    const offTag = picBlock.match(/<a:off\b([^>]+)\/?>/);
    const extTag = picBlock.match(/<a:ext\b([^>]+)\/?>/);
    if (!embedMatch || !offTag || !extTag) continue;

    const xMatch = offTag[1].match(/\bx="(-?\d+)"/);
    const yMatch = offTag[1].match(/\by="(-?\d+)"/);
    const cxMatch = extTag[1].match(/\bcx="(\d+)"/);
    const cyMatch = extTag[1].match(/\bcy="(\d+)"/);
    if (!xMatch || !yMatch || !cxMatch || !cyMatch) continue;

    const targetPath = relsMap.get(embedMatch[1]);
    if (!targetPath) continue;
    const mime = mimeForImagePath(targetPath);
    const imgBuf = entries.get(targetPath);
    if (!mime || !imgBuf || imgBuf.length === 0 || imgBuf.length > 2_000_000) continue;

    const w = Number(cxMatch[1]) / EMU_PER_PT;
    const h = Number(cyMatch[1]) / EMU_PER_PT;
    if (w <= 2 || h <= 2) continue;

    images.push({
      x: Number(xMatch[1]) / EMU_PER_PT,
      y: Number(yMatch[1]) / EMU_PER_PT,
      w,
      h,
      mime,
      base64: imgBuf.toString('base64'),
    });
  }

  return images;
}

function wrapTextLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if (!current) {
      current = w;
    } else if (current.length + 1 + w.length <= maxChars) {
      current += ' ' + w;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function extractPptxSlidesFromBuffer(buffer: Buffer): ParsedPptxSlide[] {
  const entries = extractZipEntries(buffer);

  let slideW = 960;
  let slideH = 540;
  const presBuf = entries.get('ppt/presentation.xml');
  if (presBuf) {
    const presXml = presBuf.toString('utf8');
    const szMatch = presXml.match(/<p:sldSz\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
    if (szMatch) {
      slideW = Math.max(200, Number(szMatch[1]) / EMU_PER_PT);
      slideH = Math.max(150, Number(szMatch[2]) / EMU_PER_PT);
    }
  }

  const slidePaths = Array.from(entries.keys())
    .filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml/)?.[1] || 0);
      const nb = Number(b.match(/slide(\d+)\.xml/)?.[1] || 0);
      return na - nb;
    });

  return slidePaths.map((slidePath, idx) => {
    const xml = entries.get(slidePath)!.toString('utf8');
    const paragraphs = extractParagraphsFromXml(xml);
    const relsMap = parseRelsMap(entries, slidePath);
    const images = extractEmbeddedPictures(xml, relsMap, entries);

    const bgMatch = xml.match(/<p:bg>[\s\S]*?<a:srgbClr\s+val="([0-9A-Fa-f]{6})"/);
    const bgHex = bgMatch ? `#${bgMatch[1]}` : '#FFFFFF';
    const rawText = paragraphs.join('\n') || `Slide ${idx + 1}`;
    const title = paragraphs[0] || `Slide ${idx + 1}`;

    return {
      slide_number: idx + 1,
      raw_text: rawText,
      paragraphs,
      title,
      slide_w: slideW,
      slide_h: slideH,
      images,
      bg_hex: bgHex,
    };
  });
}

export function buildSlideSvg(slide: ParsedPptxSlide, totalSlides: number): string {
  const width = 1280;
  const height = 720;
  const sx = width / (slide.slide_w || 960);
  const sy = height / (slide.slide_h || 540);
  const bg = slide.bg_hex || '#FFFFFF';

  const embeddedImageTags = slide.images
    .map((img) => {
      const x = Math.round(img.x * sx);
      const y = Math.round(img.y * sy);
      const w = Math.max(8, Math.round(img.w * sx));
      const h = Math.max(8, Math.round(img.h * sy));
      return `<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" href="data:${img.mime};base64,${img.base64}" />`;
    })
    .join('');

  const titleLines = wrapTextLines(slide.title || `Slide ${slide.slide_number}`, 52).slice(0, 2);
  const bodyParas = slide.paragraphs.slice(1);
  const bodyLines: Array<{ text: string; isBullet: boolean }> = [];
  for (const para of bodyParas) {
    if (bodyLines.length >= 14) break;
    const wrapped = wrapTextLines(para, 72);
    wrapped.forEach((line, i) => {
      if (bodyLines.length < 14) {
        bodyLines.push({ text: line, isBullet: i === 0 });
      }
    });
  }

  let cursorY = 175;
  const titleSvg = titleLines
    .map((line, i) => {
      const y = 96 + i * 38;
      return `<text x="64" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#0F172A">${escapeXml(line)}</text>`;
    })
    .join('');

  if (titleLines.length > 1) cursorY = 205;

  const bodySvg = bodyLines
    .map((item) => {
      const y = cursorY;
      cursorY += 34;
      const prefix = item.isBullet ? '&#8226; ' : '  ';
      return `<text x="72" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="400" fill="#334155">${prefix}${escapeXml(item.text)}</text>`;
    })
    .join('');

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="${bg}" />` +
    `<rect x="0" y="0" width="${width}" height="10" fill="#1D4ED8" />` +
    embeddedImageTags +
    `<line x1="64" y1="${titleLines.length > 1 ? 156 : 124}" x2="${width - 64}" y2="${titleLines.length > 1 ? 156 : 124}" stroke="#E2E8F0" stroke-width="2" />` +
    titleSvg +
    bodySvg +
    `<text x="${width - 64}" y="${height - 28}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="600" fill="#64748B">Slide ${slide.slide_number}${totalSlides > 0 ? ` / ${totalSlides}` : ''}</text>` +
    `</svg>`
  );
}

async function uploadSvgAsWebpToCloudinary(
  svgMarkup: string,
  lectureId: string,
  slideNumber: number
): Promise<string | null> {
  const cloudName =
    env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    'dtauhhlve';
  const apiKey = env.CLOUDINARY_API_KEY || '';
  const apiSecret = env.CLOUDINARY_API_SECRET || '';
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svgMarkup, 'utf8').toString('base64')}`;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    const res = await cloudinary.uploader.upload(dataUri, {
      folder: `unistudy/slides/${lectureId}`,
      public_id: `slide_${slideNumber}`,
      format: 'webp',
      quality: 'auto:good',
      overwrite: true,
      timeout: 25_000,
    });
    return res.secure_url || null;
  }

  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'unistudy.ai';
  if (cloudName && uploadPreset) {
    cloudinary.config({ cloud_name: cloudName });
    const res = await cloudinary.uploader.unsigned_upload(dataUri, uploadPreset, {
      folder: `unistudy/slides/${lectureId}`,
      public_id: `slide_${slideNumber}`,
      format: 'webp',
      timeout: 25_000,
    });
    return res.secure_url || null;
  }

  return null;
}

/**
 * Node.js cross-platform Tier 3 fallback: generates crisp 1280x720 WebP slide images
 * directly on Cloudinary when both the remote converter and Windows PowerPoint are unavailable.
 */
export async function renderAndUploadMissingSlideImages(
  lectureId: string,
  fileUrl: string,
  pptxBuffer?: Buffer
): Promise<number> {
  const { data: existingRows } = await supabaseAdmin
    .from('slides')
    .select('id, slide_number, image_url, raw_text')
    .eq('lecture_id', lectureId)
    .order('slide_number', { ascending: true });

  const missingRows = (existingRows || []).filter((r) => !isRenderableSlideImage(r.image_url));
  if (missingRows.length === 0) return 0;

  let parsedSlides: ParsedPptxSlide[] = [];
  const isPptx = fileUrl.toLowerCase().includes('.pptx');
  if (isPptx && pptxBuffer && pptxBuffer.length > 0) {
    try {
      parsedSlides = extractPptxSlidesFromBuffer(pptxBuffer);
    } catch (err) {
      console.warn(`[PptxFallbackRenderer] Could not parse PPTX buffer for ${lectureId}:`, err);
    }
  }

  const parsedByNum = new Map<number, ParsedPptxSlide>();
  for (const s of parsedSlides) {
    parsedByNum.set(s.slide_number, s);
  }

  const totalSlides = Math.max(existingRows?.length || 0, parsedSlides.length);
  let updated = 0;
  const CONCURRENCY = 5;

  for (let i = 0; i < missingRows.length; i += CONCURRENCY) {
    const batch = missingRows.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (row) => {
        const sn = Number(row.slide_number);
        const parsed = parsedByNum.get(sn);
        const slideModel: ParsedPptxSlide = parsed || {
          slide_number: sn,
          raw_text: row.raw_text || `Slide ${sn}`,
          paragraphs: String(row.raw_text || `Slide ${sn}`)
            .split(/\r?\n/)
            .map((p) => p.trim())
            .filter(Boolean),
          title:
            String(row.raw_text || `Slide ${sn}`)
              .split(/\r?\n/)
              .map((p) => p.trim())
              .find(Boolean) || `Slide ${sn}`,
          slide_w: 960,
          slide_h: 540,
          images: [],
          bg_hex: '#FFFFFF',
        };

        try {
          const svg = buildSlideSvg(slideModel, totalSlides);
          const secureUrl = await uploadSvgAsWebpToCloudinary(svg, lectureId, sn);
          if (secureUrl && isRenderableSlideImage(secureUrl)) {
            const updatePayload: Record<string, string> = { image_url: secureUrl };
            if (parsed?.raw_text && (!row.raw_text || row.raw_text.includes('\n'))) {
              updatePayload.raw_text = parsed.raw_text;
            }
            const { error } = await supabaseAdmin
              .from('slides')
              .update(updatePayload)
              .eq('id', row.id);
            if (!error) updated += 1;
          }
        } catch (uploadErr: any) {
          console.warn(`[PptxFallbackRenderer] Slide ${sn} fallback upload failed:`, uploadErr?.message || uploadErr);
        }
      })
    );
  }

  return updated;
}
