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
  svg?: string;
}

interface XmlNode {
  name: string;
  localName: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

interface PlaceholderStyle {
  type?: string;
  idx?: string;
  box?: [number, number, number, number];
  fontSize?: number;
  colorHex?: string;
  bold?: boolean;
  align?: 'l' | 'ctr' | 'r' | 'just';
  anchor?: 't' | 'ctr' | 'b';
}

type RelsMap = Map<string, { type: string; target: string }>;
type GroupTransform = [number, number, number, number, number, number, number, number];

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
      // Skip malformed entry instead of failing the entire deck
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

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = attrRegex.exec(raw)) !== null) {
    attrs[m[1]] = decodeXmlEntities(m[2] ?? m[3] ?? '');
  }
  return attrs;
}

function parseXml(xml: string): XmlNode {
  const root: XmlNode = { name: 'root', localName: 'root', attrs: {}, children: [], text: '' };
  const stack: XmlNode[] = [root];
  const tokenRegex = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<\/([A-Za-z_][\w:.-]*)\s*>|<([A-Za-z_][\w:.-]*)((?:\s+[A-Za-z_][\w:.-]*\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(xml)) !== null) {
    if (match.index > lastIndex) {
      const textChunk = xml.slice(lastIndex, match.index);
      if (textChunk) {
        stack[stack.length - 1].text += decodeXmlEntities(textChunk);
      }
    }
    lastIndex = tokenRegex.lastIndex;

    if (match[1] !== undefined) {
      stack[stack.length - 1].text += match[1];
      continue;
    }

    const closingName = match[2];
    if (closingName) {
      for (let i = stack.length - 1; i >= 1; i--) {
        if (stack[i].name === closingName) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const openName = match[3];
    if (!openName) continue;

    const attrStr = match[4] || '';
    const selfClose = match[5] === '/';
    const localIdx = openName.indexOf(':');
    const node: XmlNode = {
      name: openName,
      localName: localIdx >= 0 ? openName.slice(localIdx + 1) : openName,
      attrs: attrStr ? parseAttrs(attrStr) : {},
      children: [],
      text: '',
    };
    stack[stack.length - 1].children.push(node);
    if (!selfClose) {
      stack.push(node);
    }
  }

  return root.children[0] || root;
}

function findChild(node: XmlNode | undefined, localName: string): XmlNode | undefined {
  if (!node) return undefined;
  return node.children.find((c) => c.localName === localName);
}

function findAll(node: XmlNode | undefined, localName: string): XmlNode[] {
  const out: XmlNode[] = [];
  if (!node) return out;
  const walk = (curr: XmlNode) => {
    for (const c of curr.children) {
      if (c.localName === localName) out.push(c);
      walk(c);
    }
  };
  walk(node);
  return out;
}

function parseHexRgb(hex: string): [number, number, number] | null {
  const clean = (hex || '').trim().replace(/^#/, '');
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return [r / 255, g / 255, b / 255];
}

function rgbToHex(rgb: [number, number, number] | null | undefined, fallback = '#1E293B'): string {
  if (!rgb) return fallback;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  const hex = (v: number) => clamp(v).toString(16).padStart(2, '0').toUpperCase();
  return `#${hex(rgb[0])}${hex(rgb[1])}${hex(rgb[2])}`;
}

function luminance(rgb: [number, number, number] | null | undefined): number {
  if (!rgb) return 1;
  return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
}

function applyColorTransforms(rgb: [number, number, number] | null, clrNode: XmlNode): [number, number, number] | null {
  if (!rgb) return null;
  let [r, g, b] = rgb;
  for (const child of clrNode.children) {
    const val = Number(child.attrs.val);
    if (Number.isNaN(val)) continue;
    const frac = val / 100000;
    if (child.localName === 'tint') {
      r = r + (1 - r) * (1 - frac);
      g = g + (1 - g) * (1 - frac);
      b = b + (1 - b) * (1 - frac);
    } else if (child.localName === 'shade') {
      r *= frac;
      g *= frac;
      b *= frac;
    } else if (child.localName === 'lumMod') {
      r = Math.min(1, r * frac);
      g = Math.min(1, g * frac);
      b = Math.min(1, b * frac);
    } else if (child.localName === 'lumOff') {
      r = Math.max(0, Math.min(1, r + frac));
      g = Math.max(0, Math.min(1, g + frac));
      b = Math.max(0, Math.min(1, b + frac));
    }
  }
  return [
    Math.max(0, Math.min(1, r)),
    Math.max(0, Math.min(1, g)),
    Math.max(0, Math.min(1, b)),
  ];
}

function extractSolidColor(elem: XmlNode | undefined, themeColors: Record<string, [number, number, number]>): [number, number, number] | null {
  if (!elem) return null;
  for (const child of elem.children) {
    if (child.localName === 'srgbClr') {
      return applyColorTransforms(parseHexRgb(child.attrs.val || ''), child);
    }
    if (child.localName === 'schemeClr') {
      const scheme = child.attrs.val || '';
      const alias: Record<string, string> = { tx1: 'dk1', bg1: 'lt1', tx2: 'dk2', bg2: 'lt2' };
      const base = themeColors[alias[scheme] || scheme] || null;
      return applyColorTransforms(base, child);
    }
    if (child.localName === 'sysClr') {
      return applyColorTransforms(parseHexRgb(child.attrs.lastClr || ''), child);
    }
  }
  return null;
}

function parseThemeColors(entries: Map<string, Buffer>): Record<string, [number, number, number]> {
  const colors: Record<string, [number, number, number]> = {
    dk1: [0.07, 0.09, 0.15],
    lt1: [1, 1, 1],
    dk2: [0.12, 0.19, 0.39],
    lt2: [0.93, 0.95, 0.98],
    accent1: [0.23, 0.51, 0.96],
    accent2: [0.84, 0.61, 0.17],
    accent3: [0.06, 0.72, 0.51],
    accent4: [0.96, 0.62, 0.04],
    accent5: [0.55, 0.36, 0.96],
    accent6: [0.08, 0.72, 0.65],
  };

  const themeKey = Array.from(entries.keys())
    .filter((k) => /^ppt\/theme\/theme\d*\.xml$/.test(k))
    .sort()[0];
  if (!themeKey) return colors;

  try {
    const root = parseXml(entries.get(themeKey)!.toString('utf8'));
    const clrScheme = findAll(root, 'clrScheme')[0];
    if (clrScheme) {
      for (const entry of clrScheme.children) {
        const c = extractSolidColor(entry, colors);
        if (c) colors[entry.localName] = c;
      }
    }
  } catch {
    // Keep default palette
  }
  return colors;
}

function loadRels(entries: Map<string, Buffer>, xmlPath: string): RelsMap {
  const map: RelsMap = new Map();
  const dir = posixPath.dirname(xmlPath);
  const relsPath = posixPath.join(dir, '_rels', `${posixPath.basename(xmlPath)}.rels`);
  const buf = entries.get(relsPath);
  if (!buf) return map;

  try {
    const root = parseXml(buf.toString('utf8'));
    for (const rel of root.children) {
      if (rel.localName !== 'Relationship') continue;
      const id = rel.attrs.Id;
      const target = rel.attrs.Target || '';
      const type = rel.attrs.Type || '';
      if (!id || !target) continue;
      const resolved = target.startsWith('/')
        ? target.slice(1)
        : posixPath.normalize(posixPath.join(dir, target));
      map.set(id, { type, target: resolved });
    }
  } catch {
    // Empty rels map
  }
  return map;
}

function parseXfrmBox(spPr: XmlNode | undefined): [number, number, number, number] | undefined {
  const xfrm = findChild(spPr, 'xfrm');
  if (!xfrm) return undefined;
  const off = findChild(xfrm, 'off');
  const ext = findChild(xfrm, 'ext');
  if (!off || !ext) return undefined;
  const x = Number(off.attrs.x ?? 0) / EMU_PER_PT;
  const y = Number(off.attrs.y ?? 0) / EMU_PER_PT;
  const w = Number(ext.attrs.cx ?? 0) / EMU_PER_PT;
  const h = Number(ext.attrs.cy ?? 0) / EMU_PER_PT;
  if ([x, y, w, h].some(Number.isNaN)) return undefined;
  return [x, y, w, h];
}

function transformBox(box: [number, number, number, number], grpTx?: GroupTransform): [number, number, number, number] {
  const [x, y, w, h] = box;
  if (!grpTx) return [x, y, w, h];
  const [gx, gy, gw, gh, cx0, cy0, ccw, cch] = grpTx;
  const sx = ccw ? gw / ccw : 1;
  const sy = cch ? gh / cch : 1;
  return [gx + (x - cx0) * sx, gy + (y - cy0) * sy, w * sx, h * sy];
}

function extractPlaceholderInfo(
  spNode: XmlNode,
  themeColors: Record<string, [number, number, number]>
): { key: string | null; style: PlaceholderStyle } {
  const nvSpPr = findChild(spNode, 'nvSpPr');
  const nvPr = findChild(nvSpPr, 'nvPr');
  const ph = findChild(nvPr, 'ph');
  if (!ph) return { key: null, style: {} };

  const phType = ph.attrs.type;
  const phIdx = ph.attrs.idx;
  const spPr = findChild(spNode, 'spPr');
  const box = parseXfrmBox(spPr);
  const txBody = findChild(spNode, 'txBody');
  let fontSize: number | undefined;
  let colorHex: string | undefined;
  let bold: boolean | undefined;
  let align: PlaceholderStyle['align'];
  let anchor: PlaceholderStyle['anchor'];

  if (txBody) {
    const bodyPr = findChild(txBody, 'bodyPr');
    if (bodyPr?.attrs.anchor === 'ctr' || bodyPr?.attrs.anchor === 'b') {
      anchor = bodyPr.attrs.anchor;
    }
    const lstStyle = findChild(txBody, 'lstStyle');
    const lvl1 = findChild(lstStyle, 'lvl1pPr');
    if (lvl1?.attrs.algn === 'ctr' || lvl1?.attrs.algn === 'r' || lvl1?.attrs.algn === 'l') {
      align = lvl1.attrs.algn;
    }
    const defRPr = findChild(lvl1, 'defRPr');
    if (defRPr) {
      if (defRPr.attrs.sz) {
        const sz = Number(defRPr.attrs.sz) / 100;
        if (!Number.isNaN(sz)) fontSize = sz;
      }
      if (defRPr.attrs.b === '1') bold = true;
      const sf = findChild(defRPr, 'solidFill');
      const rgb = extractSolidColor(sf, themeColors);
      if (rgb) colorHex = rgbToHex(rgb);
    }
  }

  return {
    key: `${phType || ''}|${phIdx || ''}`,
    style: { type: phType, idx: phIdx, box, fontSize, colorHex, bold, align, anchor },
  };
}

function lookupPlaceholder(
  phMap: Map<string, PlaceholderStyle>,
  phType?: string,
  phIdx?: string
): PlaceholderStyle {
  for (const k of [`${phType || ''}|${phIdx || ''}`, `${phType || ''}|`, `|${phIdx || ''}`]) {
    if (k !== '|' && phMap.has(k)) {
      return phMap.get(k)!;
    }
  }
  return {};
}

function extractParagraphTextList(root: XmlNode): string[] {
  const paragraphs: string[] = [];
  for (const p of findAll(root, 'p')) {
    const tNodes = findAll(p, 't');
    if (tNodes.length > 0) {
      const joined = tNodes.map((t) => t.text).join('').replace(/\s+/g, ' ').trim();
      if (joined) paragraphs.push(joined);
    }
  }
  if (paragraphs.length === 0) {
    const allT = findAll(root, 't');
    const fallback = allT.map((t) => t.text).join('').replace(/\s+/g, ' ').trim();
    if (fallback) paragraphs.push(fallback);
  }
  return paragraphs;
}

function mimeForImagePath(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  return null;
}

function buildCustomGeomSvgPath(
  custGeom: XmlNode,
  box: [number, number, number, number]
): string | null {
  const pathLst = findChild(custGeom, 'pathLst');
  if (!pathLst) return null;
  const [bx, by, bw, bh] = box;
  const commands: string[] = [];

  for (const pNode of pathLst.children) {
    if (pNode.localName !== 'path') continue;
    const rawPw = Number(pNode.attrs.w ?? 0);
    const rawPh = Number(pNode.attrs.h ?? 0);

    const mapPt = (pt: XmlNode | undefined): [number, number] | null => {
      if (!pt) return null;
      const px = Number(pt.attrs.x ?? 0);
      const py = Number(pt.attrs.y ?? 0);
      if (Number.isNaN(px) || Number.isNaN(py)) return null;
      const sx = rawPw > 0 ? (px / rawPw) * bw : px / EMU_PER_PT;
      const sy = rawPh > 0 ? (py / rawPh) * bh : py / EMU_PER_PT;
      return [bx + sx, by + sy];
    };

    for (const cmd of pNode.children) {
      if (cmd.localName === 'moveTo') {
        const pt = mapPt(findChild(cmd, 'pt'));
        if (pt) commands.push(`M${pt[0].toFixed(2)} ${pt[1].toFixed(2)}`);
      } else if (cmd.localName === 'lnTo') {
        const pt = mapPt(findChild(cmd, 'pt'));
        if (pt) commands.push(`L${pt[0].toFixed(2)} ${pt[1].toFixed(2)}`);
      } else if (cmd.localName === 'cubicBezTo') {
        const pts = cmd.children.filter((c) => c.localName === 'pt').map(mapPt);
        if (pts.length === 3 && pts.every(Boolean)) {
          commands.push(
            `C${pts[0]![0].toFixed(2)} ${pts[0]![1].toFixed(2)} ${pts[1]![0].toFixed(2)} ${pts[1]![1].toFixed(2)} ${pts[2]![0].toFixed(2)} ${pts[2]![1].toFixed(2)}`
          );
        }
      } else if (cmd.localName === 'quadBezTo') {
        const pts = cmd.children.filter((c) => c.localName === 'pt').map(mapPt);
        if (pts.length === 2 && pts.every(Boolean)) {
          commands.push(
            `Q${pts[0]![0].toFixed(2)} ${pts[0]![1].toFixed(2)} ${pts[1]![0].toFixed(2)} ${pts[1]![1].toFixed(2)}`
          );
        }
      } else if (cmd.localName === 'close') {
        commands.push('Z');
      }
    }
  }

  return commands.length > 0 ? commands.join(' ') : null;
}

interface TextSpan {
  text: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  color: string;
}

interface WrappedLine {
  spans: TextSpan[];
  fontSize: number;
  align: 'l' | 'ctr' | 'r' | 'just';
  padLeft: number;
  spaceBefore: number;
}

function estimateCharWidthRatio(ch: string): number {
  if ('iIl!|.,;:\''.includes(ch)) return 0.25;
  if ('fjrt()[]{}-/ "`'.includes(ch)) return 0.32;
  if ('MW'.includes(ch)) return 0.78;
  if (ch >= 'A' && ch <= 'Z') return 0.60;
  if (ch === 'm' || ch === 'w') return 0.70;
  if ((ch >= '0' && ch <= '9') || ch === '–' || ch === '—') return 0.50;
  return 0.45;
}

function estimateWordWidthPt(text: string, fontSize: number, bold: boolean): number {
  let sum = 0;
  for (let i = 0; i < text.length; i++) {
    sum += estimateCharWidthRatio(text[i]);
  }
  return sum * fontSize * (bold ? 1.04 : 1.0);
}

function wrapParagraphSpans(
  spans: TextSpan[],
  maxWidth: number,
  align: 'l' | 'ctr' | 'r' | 'just',
  padLeft: number,
  spaceBefore: number
): WrappedLine[] {
  const tokens: Array<{ word: string; style: TextSpan }> = [];
  for (const sp of spans) {
    if (sp.text === '\n') {
      tokens.push({ word: '\n', style: sp });
      continue;
    }
    const parts = sp.text.split(/(\s+)/);
    for (const part of parts) {
      if (part.length > 0) {
        tokens.push({ word: part, style: sp });
      }
    }
  }

  const lines: WrappedLine[] = [];
  let curSpans: TextSpan[] = [];
  let curWidth = 0;
  let maxFs = spans[0]?.fontSize || 12;

  const flush = (isFirst: boolean) => {
    lines.push({
      spans: curSpans,
      fontSize: maxFs,
      align,
      padLeft,
      spaceBefore: isFirst ? spaceBefore : 0,
    });
    curSpans = [];
    curWidth = 0;
    maxFs = spans[0]?.fontSize || 12;
  };

  for (const tok of tokens) {
    if (tok.word === '\n') {
      flush(lines.length === 0);
      continue;
    }

    const tokW = estimateWordWidthPt(tok.word, tok.style.fontSize, tok.style.bold);
    const isWhitespace = /^\s+$/.test(tok.word);

    if (curSpans.length === 0 && isWhitespace) continue;

    if (curWidth > 0 && curWidth + tokW > maxWidth && !isWhitespace) {
      flush(lines.length === 0);
    }

    maxFs = Math.max(maxFs, tok.style.fontSize);
    const last = curSpans[curSpans.length - 1];
    if (
      last &&
      last.fontSize === tok.style.fontSize &&
      last.bold === tok.style.bold &&
      last.italic === tok.style.italic &&
      last.color === tok.style.color
    ) {
      last.text += tok.word;
    } else {
      curSpans.push({ ...tok.style, text: tok.word });
    }
    curWidth += tokW;
  }

  if (curSpans.length > 0) {
    flush(lines.length === 0);
  }

  return lines;
}

function renderTxBodySvg(
  txBody: XmlNode | undefined,
  box: [number, number, number, number],
  phStyle: PlaceholderStyle,
  fillRgb: [number, number, number] | null,
  themeColors: Record<string, [number, number, number]>,
  defaultFontFallback?: number,
  slideNumber = 1
): string {
  if (!txBody) return '';
  const [bx, by, bw, bh] = box;
  const bodyPr = findChild(txBody, 'bodyPr');
  const hasAutoFit = Boolean(findChild(bodyPr, 'spAutoFit'));

  const insL = bodyPr?.attrs.lIns !== undefined ? Number(bodyPr.attrs.lIns) / EMU_PER_PT : 4;
  const insR = bodyPr?.attrs.rIns !== undefined ? Number(bodyPr.attrs.rIns) / EMU_PER_PT : 4;
  const insT = bodyPr?.attrs.tIns !== undefined ? Number(bodyPr.attrs.tIns) / EMU_PER_PT : 2;
  const insB = bodyPr?.attrs.bIns !== undefined ? Number(bodyPr.attrs.bIns) / EMU_PER_PT : 2;

  const isDarkBg = fillRgb !== null && luminance(fillRgb) < 0.45;
  const defaultHex = isDarkBg
    ? '#FFFFFF'
    : phStyle.colorHex || (phStyle.type === 'title' || phStyle.type === 'ctrTitle' ? '#1E3163' : '#1F252F');
  const basePt =
    defaultFontFallback ||
    phStyle.fontSize ||
    (phStyle.type === 'title' || phStyle.type === 'ctrTitle' ? 24 : 14);
  const defaultBold = Boolean(phStyle.bold || phStyle.type === 'title' || phStyle.type === 'ctrTitle');

  const lstStyle = findChild(txBody, 'lstStyle');
  const pNodes = txBody.children.filter((c) => c.localName === 'p');
  const wrappedLines: WrappedLine[] = [];

  for (let pIdx = 0; pIdx < pNodes.length; pIdx++) {
    const p = pNodes[pIdx];
    const pPr = findChild(p, 'pPr');
    const lvl = pPr?.attrs.lvl ? Math.max(0, Math.min(8, Number(pPr.attrs.lvl) || 0)) : 0;
    const algnAttr = pPr?.attrs.algn || phStyle.align || 'l';
    const align: 'l' | 'ctr' | 'r' | 'just' =
      algnAttr === 'ctr' || algnAttr === 'r' || algnAttr === 'just' ? algnAttr : 'l';
    const marL = pPr?.attrs.marL ? Number(pPr.attrs.marL) / EMU_PER_PT : lvl * 12;

    let spaceBefore = 0;
    if (pIdx > 0) {
      const spcBef = findChild(pPr, 'spcBef');
      const spcPts = findChild(spcBef, 'spcPts');
      if (spcPts?.attrs.val) {
        const pts = Number(spcPts.attrs.val) / 100;
        if (!Number.isNaN(pts)) spaceBefore = Math.min(18, pts * 0.45);
      }
    }

    const lvlTag = `lvl${lvl + 1}pPr`;
    const lvlDef = findChild(findChild(lstStyle, lvlTag), 'defRPr');
    let lvlFontSize = basePt;
    let lvlBold = defaultBold;
    let lvlColor = defaultHex;
    if (lvlDef) {
      if (lvlDef.attrs.sz) lvlFontSize = Number(lvlDef.attrs.sz) / 100 || basePt;
      if (lvlDef.attrs.b !== undefined) lvlBold = lvlDef.attrs.b === '1';
      const sf = findChild(lvlDef, 'solidFill');
      const c = extractSolidColor(sf, themeColors);
      if (c) lvlColor = rgbToHex(c);
    }

    let bulletPrefix = '';
    if (pPr && !findChild(pPr, 'buNone')) {
      const buChar = findChild(pPr, 'buChar');
      if (buChar?.attrs.char) {
        bulletPrefix = `${buChar.attrs.char} `;
      } else if (lvl > 0) {
        bulletPrefix = '• ';
      }
    }

    const spans: TextSpan[] = [];
    if (bulletPrefix) {
      spans.push({
        text: bulletPrefix,
        fontSize: lvlFontSize,
        bold: lvlBold,
        italic: false,
        color: lvlColor,
      });
    }

    for (const child of p.children) {
      if (child.localName === 'br') {
        spans.push({ text: '\n', fontSize: lvlFontSize, bold: false, italic: false, color: lvlColor });
        continue;
      }
      if (child.localName !== 'r' && child.localName !== 'fld') continue;
      const tNode = findChild(child, 't');
      const txt =
        child.localName === 'fld' && child.attrs.type === 'slidenum'
          ? String(slideNumber)
          : tNode?.text || '';
      if (!txt) continue;

      const rPr = findChild(child, 'rPr');
      let fs = lvlFontSize;
      let bold = lvlBold;
      let italic = false;
      let color = lvlColor;

      if (rPr) {
        if (rPr.attrs.sz) {
          const parsedSz = Number(rPr.attrs.sz) / 100;
          if (!Number.isNaN(parsedSz) && parsedSz > 0) {
            fs = Math.max(6, Math.min(64, parsedSz));
          }
        }
        if (rPr.attrs.b !== undefined) bold = rPr.attrs.b === '1';
        if (rPr.attrs.i !== undefined) italic = rPr.attrs.i === '1';
        const sf = findChild(rPr, 'solidFill');
        const c = extractSolidColor(sf, themeColors);
        if (c) color = rgbToHex(c);
      }

      spans.push({ text: txt, fontSize: fs, bold, italic, color });
    }

    if (spans.length === 0) continue;

    const firstFs = spans[0]?.fontSize || basePt;
    const rawBoxW = Math.max(bw - insL - insR - marL, firstFs * 2.5);
    const singleLineAutoFit = hasAutoFit && pNodes.length === 1 && bh < firstFs * 1.95;
    const availW = singleLineAutoFit ? rawBoxW * 1.18 : rawBoxW * 1.06;
    wrappedLines.push(...wrapParagraphSpans(spans, availW, align, marL, spaceBefore));
  }

  if (wrappedLines.length === 0) return '';

  const lineHeights = wrappedLines.map((l) => l.fontSize * 1.24 + l.spaceBefore);
  const totalTextH = lineHeights.reduce((a, b) => a + b, 0);
  const anchor = bodyPr?.attrs.anchor || phStyle.anchor || 't';
  const availH = Math.max(10, bh - insT - insB);

  let cursorY = by + insT;
  if (anchor === 'ctr' && totalTextH < availH) {
    cursorY = by + insT + (availH - totalTextH) / 2;
  } else if (anchor === 'b' && totalTextH < availH) {
    cursorY = by + bh - insB - totalTextH;
  }

  const out: string[] = [];
  for (const line of wrappedLines) {
    cursorY += line.spaceBefore;
    const baselineY = cursorY + line.fontSize * 0.92;
    let anchorX = bx + insL + line.padLeft;
    let textAnchor = 'start';

    if (line.align === 'ctr') {
      anchorX = bx + insL + Math.max(0, bw - insL - insR) / 2;
      textAnchor = 'middle';
    } else if (line.align === 'r') {
      anchorX = bx + bw - insR;
      textAnchor = 'end';
    }

    const tspans = line.spans
      .map((sp) => {
        const fw = sp.bold ? ' font-weight="700"' : '';
        const fsAttr = sp.italic ? ' font-style="italic"' : '';
        return `<tspan font-size="${sp.fontSize.toFixed(1)}" fill="${sp.color}"${fw}${fsAttr}>${escapeXml(sp.text)}</tspan>`;
      })
      .join('');

    out.push(
      `<text x="${anchorX.toFixed(1)}" y="${baselineY.toFixed(1)}" text-anchor="${textAnchor}" xml:space="preserve" font-family="DejaVu Sans, Arial, Helvetica, sans-serif">${tspans}</text>`
    );
    cursorY += line.fontSize * 1.24;
  }

  return out.join('');
}

function buildSceneGraphSlideSvg(
  entries: Map<string, Buffer>,
  slidePath: string,
  slideW: number,
  slideH: number,
  themeColors: Record<string, [number, number, number]>,
  xmlCache: Map<string, XmlNode>,
  relsCache: Map<string, RelsMap>,
  slideNumber = 1
): { svg: string; paragraphs: string[] } {
  const getXml = (p: string): XmlNode | undefined => {
    if (!xmlCache.has(p) && entries.has(p)) {
      xmlCache.set(p, parseXml(entries.get(p)!.toString('utf8')));
    }
    return xmlCache.get(p);
  };
  const getRels = (p: string): RelsMap => {
    if (!relsCache.has(p)) {
      relsCache.set(p, loadRels(entries, p));
    }
    return relsCache.get(p)!;
  };

  const collectPartMeta = (xmlPath: string) => {
    const root = getXml(xmlPath);
    const phMap = new Map<string, PlaceholderStyle>();
    const staticNodes: Array<{ node: XmlNode; xmlPath: string }> = [];
    const cSld = findChild(root, 'cSld');
    const bgElem = findChild(cSld, 'bg');
    const spTree = findChild(cSld, 'spTree');

    if (spTree) {
      for (const child of spTree.children) {
        if (child.localName === 'sp') {
          const { key, style } = extractPlaceholderInfo(child, themeColors);
          if (key) {
            phMap.set(key, style);
          } else {
            staticNodes.push({ node: child, xmlPath });
          }
        } else if (child.localName === 'pic' || child.localName === 'grpSp' || child.localName === 'graphicFrame') {
          staticNodes.push({ node: child, xmlPath });
        }
      }
    }
    return { phMap, staticNodes, bgElem };
  };

  const slideRoot = getXml(slidePath)!;
  const slideRels = getRels(slidePath);
  const paragraphs = extractParagraphTextList(slideRoot);

  let layoutPath: string | undefined;
  let masterPath: string | undefined;
  for (const rel of slideRels.values()) {
    if (rel.type.endsWith('/slideLayout') && entries.has(rel.target)) {
      layoutPath = rel.target;
      break;
    }
  }
  if (layoutPath) {
    for (const rel of getRels(layoutPath).values()) {
      if (rel.type.endsWith('/slideMaster') && entries.has(rel.target)) {
        masterPath = rel.target;
        break;
      }
    }
  }

  const phMap = new Map<string, PlaceholderStyle>();
  let masterStatics: Array<{ node: XmlNode; xmlPath: string }> = [];
  let masterBg: XmlNode | undefined;
  if (masterPath) {
    const m = collectPartMeta(masterPath);
    m.phMap.forEach((v, k) => phMap.set(k, v));
    masterStatics = m.staticNodes;
    masterBg = m.bgElem;
  }

  let layoutStatics: Array<{ node: XmlNode; xmlPath: string }> = [];
  let layoutBg: XmlNode | undefined;
  if (layoutPath) {
    const l = collectPartMeta(layoutPath);
    l.phMap.forEach((v, k) => {
      const merged: PlaceholderStyle = { ...(phMap.get(k) || {}) };
      if (v.type) merged.type = v.type;
      if (v.idx) merged.idx = v.idx;
      if (v.box) merged.box = v.box;
      if (v.fontSize) merged.fontSize = v.fontSize;
      if (v.colorHex) merged.colorHex = v.colorHex;
      if (v.bold) merged.bold = v.bold;
      if (v.align) merged.align = v.align;
      if (v.anchor) merged.anchor = v.anchor;
      phMap.set(k, merged);
    });
    layoutStatics = l.staticNodes;
    layoutBg = l.bgElem;
  }

  const parts: string[] = [];

  const renderBg = (bgNode: XmlNode | undefined, bgXmlPath: string): boolean => {
    if (!bgNode) return false;
    const bgPr = findChild(bgNode, 'bgPr');
    if (bgPr) {
      const sf = findChild(bgPr, 'solidFill');
      const rgb = extractSolidColor(sf, themeColors);
      if (rgb) {
        parts.push(`<rect x="0" y="0" width="${slideW}" height="${slideH}" fill="${rgbToHex(rgb)}"/>`);
        return true;
      }
      const bf = findChild(bgPr, 'blipFill');
      const blip = findChild(bf, 'blip');
      const rid = blip?.attrs['r:embed'];
      if (rid) {
        const rel = getRels(bgXmlPath).get(rid);
        const mime = rel ? mimeForImagePath(rel.target) : null;
        const imgBuf = rel ? entries.get(rel.target) : undefined;
        if (mime && imgBuf && imgBuf.length <= 3_500_000) {
          parts.push(
            `<image x="0" y="0" width="${slideW}" height="${slideH}" preserveAspectRatio="none" href="data:${mime};base64,${imgBuf.toString('base64')}"/>`
          );
          return true;
        }
      }
    }
    const bgRef = findChild(bgNode, 'bgRef');
    const refRgb = extractSolidColor(bgRef, themeColors);
    if (refRgb) {
      parts.push(`<rect x="0" y="0" width="${slideW}" height="${slideH}" fill="${rgbToHex(refRgb)}"/>`);
      return true;
    }
    return false;
  };

  const renderTable = (box: [number, number, number, number], tblNode: XmlNode) => {
    const [tx, ty, tw, th] = box;
    const grid = findChild(tblNode, 'tblGrid');
    const rawCols = grid
      ? grid.children.filter((c) => c.localName === 'gridCol').map((c) => Math.max(8, Number(c.attrs.w || 914400) / EMU_PER_PT))
      : [];
    const rows = tblNode.children.filter((c) => c.localName === 'tr');
    if (rows.length === 0 || rawCols.length === 0) return;

    const totalCw = rawCols.reduce((a, b) => a + b, 0) || tw;
    const colWidths = rawCols.map((w) => (w / totalCw) * tw);
    const rawRowH = rows.map((r) => Math.max(16, Number(r.attrs.h || 370840) / EMU_PER_PT));
    const totalRh = rawRowH.reduce((a, b) => a + b, 0);
    const rowHeights = totalRh > th && totalRh > 0 ? rawRowH.map((h) => (h / totalRh) * th) : rawRowH;

    let curY = ty;
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const tr = rows[rIdx];
      const rh = rowHeights[rIdx];
      const tcs = tr.children.filter((c) => c.localName === 'tc');
      let curX = tx;
      let cIdx = 0;
      for (const tc of tcs) {
        if (cIdx >= colWidths.length) break;
        const span = Math.max(1, Number(tc.attrs.gridSpan || 1) || 1);
        const cw = colWidths.slice(cIdx, cIdx + span).reduce((a, b) => a + b, 0);
        const tcPr = findChild(tc, 'tcPr');
        const fillRgb = tcPr ? extractSolidColor(findChild(tcPr, 'solidFill'), themeColors) : null;
        const fillHex = fillRgb ? rgbToHex(fillRgb) : rIdx === 0 ? '#1E3163' : rIdx % 2 === 1 ? '#F8FAFC' : '#FFFFFF';
        parts.push(
          `<rect x="${curX.toFixed(1)}" y="${curY.toFixed(1)}" width="${cw.toFixed(1)}" height="${rh.toFixed(1)}" fill="${fillHex}" stroke="#CBD5E1" stroke-width="0.6"/>`
        );
        const effFillRgb = fillRgb || (rIdx === 0 ? ([0.12, 0.19, 0.39] as [number, number, number]) : null);
        const txBody = findChild(tc, 'txBody');
        if (txBody) {
          parts.push(
            renderTxBodySvg(
              txBody,
              [curX, curY, cw, rh],
              { bold: rIdx === 0, fontSize: 10.5 },
              effFillRgb,
              themeColors,
              10.5,
              slideNumber
            )
          );
        }
        curX += cw;
        cIdx += span;
      }
      curY += rh;
    }
  };

  const renderNode = (node: XmlNode, xmlPath: string, grpTx?: GroupTransform) => {
    if (node.localName === 'grpSp') {
      const grpPr = findChild(node, 'grpSpPr');
      const xfrm = findChild(grpPr, 'xfrm');
      let nextTx = grpTx;
      if (xfrm) {
        const off = findChild(xfrm, 'off');
        const ext = findChild(xfrm, 'ext');
        const chOff = findChild(xfrm, 'chOff');
        const chExt = findChild(xfrm, 'chExt');
        if (off && ext && chOff && chExt) {
          const [gx, gy, gw, gh] = transformBox(
            [
              Number(off.attrs.x || 0) / EMU_PER_PT,
              Number(off.attrs.y || 0) / EMU_PER_PT,
              Number(ext.attrs.cx || 0) / EMU_PER_PT,
              Number(ext.attrs.cy || 0) / EMU_PER_PT,
            ],
            grpTx
          );
          nextTx = [
            gx,
            gy,
            gw,
            gh,
            Number(chOff.attrs.x || 0) / EMU_PER_PT,
            Number(chOff.attrs.y || 0) / EMU_PER_PT,
            Number(chExt.attrs.cx || 0) / EMU_PER_PT,
            Number(chExt.attrs.cy || 0) / EMU_PER_PT,
          ];
        }
      }
      for (const child of node.children) {
        if (['sp', 'pic', 'grpSp', 'graphicFrame'].includes(child.localName)) {
          renderNode(child, xmlPath, nextTx);
        }
      }
      return;
    }

    if (node.localName === 'pic') {
      const spPr = findChild(node, 'spPr');
      const box = parseXfrmBox(spPr);
      if (!box) return;
      const [x, y, w, h] = transformBox(box, grpTx);
      if (w <= 0.5 || h <= 0.5) return;
      const bf = findChild(node, 'blipFill');
      const blip = findChild(bf, 'blip');
      const rid = blip?.attrs['r:embed'];
      if (!rid) return;
      const rel = getRels(xmlPath).get(rid);
      const mime = rel ? mimeForImagePath(rel.target) : null;
      const imgBuf = rel ? entries.get(rel.target) : undefined;
      if (!mime || !imgBuf || imgBuf.length === 0 || imgBuf.length > 3_500_000) return;

      parts.push(
        `<image x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" preserveAspectRatio="none" href="data:${mime};base64,${imgBuf.toString('base64')}"/>`
      );
      return;
    }

    if (node.localName === 'graphicFrame') {
      const xfrm = findChild(node, 'xfrm');
      const rawBox = xfrm
        ? (() => {
            const off = findChild(xfrm, 'off');
            const ext = findChild(xfrm, 'ext');
            if (!off || !ext) return undefined;
            return [
              Number(off.attrs.x || 0) / EMU_PER_PT,
              Number(off.attrs.y || 0) / EMU_PER_PT,
              Number(ext.attrs.cx || 0) / EMU_PER_PT,
              Number(ext.attrs.cy || 0) / EMU_PER_PT,
            ] as [number, number, number, number];
          })()
        : undefined;
      if (!rawBox) return;
      const box = transformBox(rawBox, grpTx);
      if (box[2] <= 2 || box[3] <= 2) return;
      const tblNode = findAll(node, 'tbl')[0];
      if (tblNode) {
        renderTable(box, tblNode);
      }
      return;
    }

    if (node.localName === 'sp') {
      const nvSpPr = findChild(node, 'nvSpPr');
      const nvPr = findChild(nvSpPr, 'nvPr');
      const ph = findChild(nvPr, 'ph');
      const phType = ph?.attrs.type;
      const phIdx = ph?.attrs.idx;
      const phStyle: PlaceholderStyle = { ...lookupPlaceholder(phMap, phType, phIdx) };
      if (phType && !phStyle.type) phStyle.type = phType;

      const spPr = findChild(node, 'spPr');
      const rawBox = parseXfrmBox(spPr) || phStyle.box;
      if (!rawBox) return;
      const box = transformBox(rawBox, grpTx);
      const [x, y, w, h] = box;
      if (w + h <= 0.5) return;

      let fillRgb: [number, number, number] | null = null;
      if (spPr && !findChild(spPr, 'noFill')) {
        const sf = findChild(spPr, 'solidFill');
        if (sf) {
          fillRgb = extractSolidColor(sf, themeColors);
        } else {
          const styleNode = findChild(node, 'style');
          const fillRef = findChild(styleNode, 'fillRef');
          if (fillRef && fillRef.attrs.idx !== '0') {
            fillRgb = extractSolidColor(fillRef, themeColors);
          }
        }
      }

      let strokeRgb: [number, number, number] | null = null;
      let strokeW = 0.75;
      const ln = findChild(spPr, 'ln');
      if (ln && !findChild(ln, 'noFill')) {
        const lnSf = findChild(ln, 'solidFill');
        if (lnSf) {
          strokeRgb = extractSolidColor(lnSf, themeColors);
        } else {
          const styleNode = findChild(node, 'style');
          const lnRef = findChild(styleNode, 'lnRef');
          if (lnRef && lnRef.attrs.idx !== '0') {
            strokeRgb = extractSolidColor(lnRef, themeColors);
          }
        }
        if (ln.attrs.w) {
          strokeW = Math.max(0.5, Number(ln.attrs.w) / EMU_PER_PT || 0.75);
        }
      }

      const fillAttr = fillRgb ? rgbToHex(fillRgb) : 'none';
      const strokeAttr = strokeRgb ? rgbToHex(strokeRgb) : 'none';

      if (fillRgb || strokeRgb) {
        const custGeom = findChild(spPr, 'custGeom');
        const customD = custGeom ? buildCustomGeomSvgPath(custGeom, box) : null;
        if (customD) {
          parts.push(
            `<path d="${customD}" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${strokeW.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`
          );
        } else {
          const prstGeom = findChild(spPr, 'prstGeom');
          const prst = prstGeom?.attrs.prst || 'rect';
          if (prst === 'ellipse') {
            parts.push(
              `<ellipse cx="${(x + w / 2).toFixed(1)}" cy="${(y + h / 2).toFixed(1)}" rx="${(w / 2).toFixed(1)}" ry="${(h / 2).toFixed(1)}" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${strokeW.toFixed(2)}"/>`
            );
          } else if (prst === 'roundRect') {
            const r = Math.min(w, h) * 0.12;
            parts.push(
              `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${r.toFixed(1)}" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${strokeW.toFixed(2)}"/>`
            );
          } else if (prst === 'line' || w <= 0.1 || h <= 0.1) {
            parts.push(
              `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + w).toFixed(1)}" y2="${(y + h).toFixed(1)}" stroke="${strokeAttr === 'none' ? fillAttr : strokeAttr}" stroke-width="${strokeW.toFixed(2)}" stroke-linecap="round"/>`
            );
          } else {
            parts.push(
              `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${strokeW.toFixed(2)}"/>`
            );
          }
        }
      }

      const txBody = findChild(node, 'txBody');
      if (txBody) {
        parts.push(renderTxBodySvg(txBody, box, phStyle, fillRgb, themeColors, undefined, slideNumber));
      }
    }
  };

  parts.push(`<rect x="0" y="0" width="${slideW}" height="${slideH}" fill="#FFFFFF"/>`);

  const cSld = findChild(slideRoot, 'cSld');
  const slideBg = findChild(cSld, 'bg');
  if (!renderBg(slideBg, slidePath)) {
    if (!(layoutPath && renderBg(layoutBg, layoutPath))) {
      if (masterPath) renderBg(masterBg, masterPath);
    }
  }

  const showMaster = slideRoot.attrs.showMasterSp !== '0';
  if (showMaster) {
    for (const st of masterStatics) {
      renderNode(st.node, st.xmlPath);
    }
  }
  for (const st of layoutStatics) {
    renderNode(st.node, st.xmlPath);
  }

  const spTree = findChild(cSld, 'spTree');
  if (spTree) {
    for (const child of spTree.children) {
      if (['sp', 'pic', 'grpSp', 'graphicFrame'].includes(child.localName)) {
        renderNode(child, slidePath);
      }
    }
  }

  const outH = Math.max(360, Math.round((1280 * slideH) / (slideW || 960)));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="${outH}" viewBox="0 0 ${slideW.toFixed(1)} ${slideH.toFixed(1)}">${parts.join('')}</svg>`;
  return { svg, paragraphs };
}

export function extractPptxSlidesFromBuffer(buffer: Buffer): ParsedPptxSlide[] {
  const entries = extractZipEntries(buffer);
  const themeColors = parseThemeColors(entries);

  let slideW = 960;
  let slideH = 540;
  const presBuf = entries.get('ppt/presentation.xml');
  if (presBuf) {
    const presRoot = parseXml(presBuf.toString('utf8'));
    const sldSz = findAll(presRoot, 'sldSz')[0];
    if (sldSz) {
      slideW = Math.max(200, Number(sldSz.attrs.cx || 12192000) / EMU_PER_PT);
      slideH = Math.max(150, Number(sldSz.attrs.cy || 6858000) / EMU_PER_PT);
    }
  }

  const slidePaths = Array.from(entries.keys())
    .filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml/)?.[1] || 0);
      const nb = Number(b.match(/slide(\d+)\.xml/)?.[1] || 0);
      return na - nb;
    });

  const xmlCache = new Map<string, XmlNode>();
  const relsCache = new Map<string, RelsMap>();

  return slidePaths.map((slidePath, idx) => {
    const { svg, paragraphs } = buildSceneGraphSlideSvg(
      entries,
      slidePath,
      slideW,
      slideH,
      themeColors,
      xmlCache,
      relsCache,
      idx + 1
    );
    const rawText = paragraphs.join('\n') || `Slide ${idx + 1}`;
    const title = paragraphs[0] || `Slide ${idx + 1}`;
    return {
      slide_number: idx + 1,
      raw_text: rawText,
      paragraphs,
      title,
      slide_w: slideW,
      slide_h: slideH,
      svg,
    };
  });
}

function wrapPlainLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if (!current) current = w;
    else if (current.length + 1 + w.length <= maxChars) current += ' ' + w;
    else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function buildSlideSvg(slide: ParsedPptxSlide, totalSlides: number): string {
  if (slide.svg) return slide.svg;

  const width = 1280;
  const height = 720;
  const titleLines = wrapPlainLines(slide.title || `Slide ${slide.slide_number}`, 52).slice(0, 2);
  const bodyLines: string[] = [];
  for (const para of slide.paragraphs.slice(1)) {
    if (bodyLines.length >= 14) break;
    for (const line of wrapPlainLines(para, 72)) {
      if (bodyLines.length < 14) bodyLines.push(line);
    }
  }

  const titleSvg = titleLines
    .map((line, i) => `<text x="64" y="${96 + i * 38}" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#0F172A">${escapeXml(line)}</text>`)
    .join('');
  let cursorY = titleLines.length > 1 ? 205 : 175;
  const bodySvg = bodyLines
    .map((line) => {
      const y = cursorY;
      cursorY += 34;
      return `<text x="72" y="${y}" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="22" fill="#334155">${escapeXml(line)}</text>`;
    })
    .join('');

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="#FFFFFF"/>` +
    `<rect x="0" y="0" width="${width}" height="10" fill="#1D4ED8"/>` +
    titleSvg +
    bodySvg +
    `<text x="${width - 64}" y="${height - 28}" text-anchor="end" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="16" font-weight="600" fill="#64748B">Slide ${slide.slide_number}${totalSlides > 0 ? ` / ${totalSlides}` : ''}</text>` +
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
 * Node.js cross-platform Tier 3 fallback: renders full OpenXML scene-graph slides to WebP on Cloudinary
 * when both the remote converter and Windows PowerPoint are unavailable.
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
