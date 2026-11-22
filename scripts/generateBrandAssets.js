const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Ensure directories exist
const brandDir = path.join(__dirname, '../frontend/public/brand');
const publicDir = path.join(__dirname, '../frontend/public');
const mobileDir = path.join(__dirname, '../mobile/assets');

if (!fs.existsSync(brandDir)) fs.mkdirSync(brandDir, { recursive: true });

/**
 * Generates the master collegiate emblem SVG group.
 * Normalized within a 100x100 coordinate space.
 * @param {'color' | 'reversed' | 'mono-black' | 'mono-white'} mode
 */
function getEmblemSvgGroup(mode) {
  const isMonoBlack = mode === 'mono-black';
  const isMonoWhite = mode === 'mono-white';
  const isReversed = mode === 'reversed';

  const goldFill = isMonoBlack ? '#000000' : isMonoWhite ? '#FFFFFF' : 'url(#goldGrad)';
  const goldLight = isMonoBlack ? '#333333' : isMonoWhite ? '#E2E8F0' : '#FBD880';
  const goldDark = isMonoBlack ? '#000000' : isMonoWhite ? '#CBD5E1' : '#966903';
  const navyFill = isMonoBlack ? '#000000' : isMonoWhite ? '#FFFFFF' : isReversed ? '#FFFFFF' : 'url(#navyGrad)';
  const beaconCore = isMonoBlack ? '#FFFFFF' : isMonoWhite ? '#000000' : isReversed ? '#00004E' : '#FFFFFF';

  return `
    <!-- Defs for Gradients & Shadow -->
    <defs>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#F9CF6E" />
        <stop offset="45%" stop-color="#D89A06" />
        <stop offset="100%" stop-color="#A87403" />
      </linearGradient>
      <linearGradient id="navyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#00005C" />
        <stop offset="100%" stop-color="#000038" />
      </linearGradient>
      <filter id="softGlow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#D89A06" flood-opacity="0.3" />
      </filter>
    </defs>

    <!-- 1. Classical Laurel Branches (Subtle collegiate frame) -->
    <g id="laurel-wreath" opacity="${isMonoBlack ? '0.85' : isMonoWhite ? '0.9' : '0.95'}">
      <!-- Left Laurel Leaves -->
      <path d="M 15,38 C 11,46 12,56 16,63 C 14,58 13,50 16,42 Z" fill="${goldDark}" />
      <path d="M 12,50 C 7,56 9,65 14,71 C 11,66 11,58 15,53 Z" fill="${goldFill}" />
      <path d="M 13,64 C 9,72 13,80 20,84 C 16,81 15,73 17,67 Z" fill="${goldLight}" />
      <path d="M 20,77 C 18,84 25,91 32,93 C 27,90 25,84 25,79 Z" fill="${goldFill}" />

      <!-- Right Laurel Leaves -->
      <path d="M 85,38 C 89,46 88,56 84,63 C 86,58 87,50 84,42 Z" fill="${goldDark}" />
      <path d="M 88,50 C 93,56 91,65 86,71 C 89,66 89,58 85,53 Z" fill="${goldFill}" />
      <path d="M 87,64 C 91,72 87,80 80,84 C 84,81 85,73 83,67 Z" fill="${goldLight}" />
      <path d="M 80,77 C 82,84 75,91 68,93 C 73,90 75,84 75,79 Z" fill="${goldFill}" />
    </g>

    <!-- 2. Monumental 'U' Pillars & Open Book Colonnade -->
    <g id="colonnade-pillars">
      <!-- Left Monumental Column -->
      <path d="M 23,38 L 39,46 L 39,68 C 39,78 43,84 50,85 L 50,94 C 33,93 23,83 23,67 Z" fill="${navyFill}" />
      <!-- Left Column Cap Bevel -->
      <polygon points="23,38 39,46 39,41 23,33" fill="${goldLight}" opacity="0.8" />

      <!-- Right Monumental Column -->
      <path d="M 77,38 L 61,46 L 61,68 C 61,78 57,84 50,85 L 50,94 C 67,93 77,83 77,67 Z" fill="${navyFill}" />
      <!-- Right Column Cap Bevel -->
      <polygon points="77,38 61,46 61,41 77,33" fill="${goldDark}" opacity="0.8" />

      <!-- Open Book Foundation Spine & Curved Pages -->
      <path d="M 27,74 Q 38,79 50,82 L 50,89 Q 38,85 27,80 Z" fill="${goldFill}" />
      <path d="M 73,74 Q 62,79 50,82 L 50,89 Q 62,85 73,80 Z" fill="${goldLight}" />
    </g>

    <!-- 3. Mortarboard Cap (Collegiate Apex Diamond) -->
    <g id="mortarboard-apex" filter="url(#softGlow)">
      <!-- Main Isometric Diamond -->
      <polygon points="50,4 94,22 50,40 6,22" fill="${goldFill}" />
      <!-- Top Facet Light Highlight -->
      <polygon points="50,4 94,22 50,22 6,22" fill="${goldLight}" opacity="0.35" />
      <!-- Right Facet Bevel -->
      <polygon points="50,40 94,22 88,27 50,43" fill="${goldDark}" opacity="0.6" />

      <!-- Skullcap Underband -->
      <path d="M 28,29 Q 50,43 72,29 L 72,36 Q 50,50 28,36 Z" fill="${goldDark}" />

      <!-- Mortarboard Button -->
      <ellipse cx="50" cy="22" rx="4" ry="2.8" fill="${navyFill}" />

      <!-- Draped Silk Tassel -->
      <path d="M 50,22 Q 78,24 88,32 L 89,52" stroke="${goldDark}" stroke-width="2.5" stroke-linecap="round" fill="none" />
      <polygon points="86,51 92,51 90,62 88,62" fill="${goldFill}" />
    </g>

    <!-- 4. Central Academic Beacon (Diamond Spark of Truth & Knowledge) -->
    <g id="beacon-flame">
      <polygon points="50,44 43,56 50,68 57,56" fill="${goldFill}" />
      <polygon points="50,44 57,56 50,68 50,44" fill="${goldLight}" />
      <circle cx="50" cy="56" r="2.2" fill="${beaconCore}" />
    </g>
  `;
}

/**
 * Builds Full Horizontal Primary Logo
 */
function buildPrimarySvg(mode) {
  const isReversed = mode === 'reversed';
  const isMonoBlack = mode === 'mono-black';
  const isMonoWhite = mode === 'mono-white';

  const textColor = isMonoBlack ? '#000000' : isMonoWhite ? '#FFFFFF' : isReversed ? '#FFFFFF' : '#00004E';
  const badgeBg = isMonoBlack ? '#000000' : isMonoWhite ? '#FFFFFF' : 'url(#goldBadgeGrad)';
  const badgeText = isMonoBlack ? '#FFFFFF' : isMonoWhite ? '#000000' : isReversed ? '#00004E' : '#00004E';
  const subColor = isMonoBlack ? '#333333' : isMonoWhite ? '#CCCCCC' : isReversed ? '#D89A06' : '#5A6484';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 48" width="100%" height="100%" fill="none">
    <defs>
      <linearGradient id="goldBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#F9CF6E" />
        <stop offset="50%" stop-color="#D89A06" />
        <stop offset="100%" stop-color="#A87403" />
      </linearGradient>
    </defs>

    <!-- Scaled Emblem (44x44) -->
    <g transform="translate(2, 2) scale(0.44)">
      ${getEmblemSvgGroup(mode)}
    </g>

    <!-- Typography Lockup -->
    <g transform="translate(56, 0)">
      <!-- Brand Name -->
      <text x="0" y="27" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="27" font-weight="900" letter-spacing="-0.8" fill="${textColor}">
        Uni<tspan font-weight="700">Study</tspan>
      </text>

      <!-- AI Pill Badge -->
      <g transform="translate(133, 7)">
        <rect x="0" y="0" width="37" height="23" rx="6" fill="${badgeBg}" />
        <text x="18.5" y="16.5" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" letter-spacing="0.5" fill="${badgeText}" text-anchor="middle">
          AI
        </text>
      </g>

      <!-- Descriptor Subtitle -->
      <text x="1" y="41" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="7.5" font-weight="800" letter-spacing="1.5" fill="${subColor}">
        UPSA ACADEMIC EXCELLENCE
      </text>
    </g>
  </svg>`;
}

/**
 * Builds Vertical Stacked Logo
 */
function buildStackedSvg(mode) {
  const isReversed = mode === 'reversed';
  const isMonoBlack = mode === 'mono-black';
  const isMonoWhite = mode === 'mono-white';

  const textColor = isMonoBlack ? '#000000' : isMonoWhite ? '#FFFFFF' : isReversed ? '#FFFFFF' : '#00004E';
  const goldColor = isMonoBlack ? '#000000' : isMonoWhite ? '#FFFFFF' : '#D89A06';
  const subColor = isMonoBlack ? '#333333' : isMonoWhite ? '#CCCCCC' : isReversed ? '#D89A06' : '#5A6484';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%" fill="none">
    <!-- Centered Emblem (108x108) -->
    <g transform="translate(46, 12) scale(1.08)">
      ${getEmblemSvgGroup(mode)}
    </g>

    <!-- Typography -->
    <g transform="translate(100, 154)" text-anchor="middle">
      <text x="0" y="0" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="900" letter-spacing="-0.6" fill="${textColor}">
        UniStudy <tspan fill="${goldColor}">AI</tspan>
      </text>
      <text x="0" y="18" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="7.5" font-weight="800" letter-spacing="1.8" fill="${subColor}">
        UPSA ACADEMIC EXCELLENCE
      </text>
    </g>
  </svg>`;
}

/**
 * Builds Standalone Icon
 */
function buildIconSvg(mode, withBackground = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%" fill="none">
    ${withBackground ? `
      <rect x="0" y="0" width="128" height="128" rx="28" fill="#00004E" />
      <rect x="0.5" y="0.5" width="127" height="127" rx="27.5" stroke="#D89A06" stroke-opacity="0.4" stroke-width="1.5" />
    ` : ''}
    <g transform="translate(${withBackground ? '16, 16' : '8, 8'}) scale(${withBackground ? '0.96' : '1.12'})">
      ${getEmblemSvgGroup(mode)}
    </g>
  </svg>`;
}

/**
 * Builds Typographic Wordmark Only
 */
function buildWordmarkSvg(mode) {
  const isReversed = mode === 'reversed';
  const isMonoBlack = mode === 'mono-black';
  const isMonoWhite = mode === 'mono-white';

  const textColor = isMonoBlack ? '#000000' : isMonoWhite ? '#FFFFFF' : isReversed ? '#FFFFFF' : '#00004E';
  const goldColor = isMonoBlack ? '#000000' : isMonoWhite ? '#FFFFFF' : '#D89A06';
  const subColor = isMonoBlack ? '#333333' : isMonoWhite ? '#CCCCCC' : isReversed ? '#D89A06' : '#5A6484';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 48" width="100%" height="100%" fill="none">
    <g transform="translate(4, 0)">
      <text x="0" y="27" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" letter-spacing="-0.8" fill="${textColor}">
        UniStudy <tspan fill="${goldColor}">AI</tspan>
      </text>
      <text x="1" y="41" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="7.5" font-weight="800" letter-spacing="1.5" fill="${subColor}">
        UPSA ACADEMIC EXCELLENCE
      </text>
    </g>
  </svg>`;
}

async function generateAll() {
  console.log('🎨 Generating Authentic Human-Crafted Brand Assets for UniStudy (UPSA)...');

  // Master definition dictionary
  const assets = [
    // 1. Primary Horizontal
    { file: 'logo-primary.svg', svg: buildPrimarySvg('color'), png: 'logo-primary.png', w: 1024, h: 192 },
    { file: 'logo-primary-reversed.svg', svg: buildPrimarySvg('reversed'), png: 'logo-primary-reversed.png', w: 1024, h: 192 },
    { file: 'logo-primary-mono-black.svg', svg: buildPrimarySvg('mono-black'), png: 'logo-primary-mono-black.png', w: 1024, h: 192 },
    { file: 'logo-primary-mono-white.svg', svg: buildPrimarySvg('mono-white'), png: 'logo-primary-mono-white.png', w: 1024, h: 192 },

    // 2. Stacked
    { file: 'logo-stacked.svg', svg: buildStackedSvg('color'), png: 'logo-stacked.png', w: 720, h: 720 },
    { file: 'logo-stacked-reversed.svg', svg: buildStackedSvg('reversed'), png: 'logo-stacked-reversed.png', w: 720, h: 720 },
    { file: 'logo-stacked-mono-black.svg', svg: buildStackedSvg('mono-black'), png: 'logo-stacked-mono-black.png', w: 720, h: 720 },
    { file: 'logo-stacked-mono-white.svg', svg: buildStackedSvg('mono-white'), png: 'logo-stacked-mono-white.png', w: 720, h: 720 },

    // 3. Icon
    { file: 'logo-icon.svg', svg: buildIconSvg('color', false), png: 'logo-icon.png', w: 512, h: 512 },
    { file: 'logo-icon-reversed.svg', svg: buildIconSvg('color', true), png: 'logo-icon-reversed.png', w: 512, h: 512 },
    { file: 'logo-icon-mono-black.svg', svg: buildIconSvg('mono-black', false), png: 'logo-icon-mono-black.png', w: 512, h: 512 },
    { file: 'logo-icon-mono-white.svg', svg: buildIconSvg('mono-white', false), png: 'logo-icon-mono-white.png', w: 512, h: 512 },

    // 4. Wordmark
    { file: 'logo-wordmark.svg', svg: buildWordmarkSvg('color'), png: 'logo-wordmark.png', w: 800, h: 192 },
    { file: 'logo-wordmark-reversed.svg', svg: buildWordmarkSvg('reversed'), png: 'logo-wordmark-reversed.png', w: 800, h: 192 },
    { file: 'logo-wordmark-mono-black.svg', svg: buildWordmarkSvg('mono-black'), png: 'logo-wordmark-mono-black.png', w: 800, h: 192 },
    { file: 'logo-wordmark-mono-white.svg', svg: buildWordmarkSvg('mono-white'), png: 'logo-wordmark-mono-white.png', w: 800, h: 192 },

    // 5. Favicon
    { file: 'favicon.svg', svg: buildIconSvg('color', false), png: null },
  ];

  for (const item of assets) {
    const svgPath = path.join(brandDir, item.file);
    fs.writeFileSync(svgPath, item.svg, 'utf8');

    if (item.png) {
      const pngPath = path.join(brandDir, item.png);
      await sharp(Buffer.from(item.svg))
        .resize(item.w, item.h)
        .png({ quality: 100 })
        .toFile(pngPath);
    }
  }

  // Also copy key root public assets
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), buildPrimarySvg('color'), 'utf8');
  fs.writeFileSync(path.join(publicDir, 'logo-dark.svg'), buildPrimarySvg('reversed'), 'utf8');
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), buildIconSvg('color', false), 'utf8');

  // App & Web icons in public root
  await sharp(Buffer.from(buildIconSvg('color', false)))
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'icon.png'));

  await sharp(Buffer.from(buildIconSvg('color', true)))
    .resize(180, 180)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'apple-icon.png'));

  // Mobile App Icon
  if (fs.existsSync(mobileDir)) {
    await sharp(Buffer.from(buildIconSvg('color', true)))
      .resize(1024, 1024)
      .png({ quality: 100 })
      .toFile(path.join(mobileDir, 'icon.png'));
    console.log('✅ Updated mobile/assets/icon.png (1024x1024)');
  }

  console.log(`✅ All brand assets successfully generated in ${brandDir} and ${publicDir}`);
}

generateAll().catch(err => {
  console.error('Generation failed:', err);
  process.exit(1);
});
