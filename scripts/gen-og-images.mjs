import sharp from 'sharp';
import matter from 'gray-matter';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BLOG_DIR = join(ROOT, 'content', 'blog');
const OUT_DIR = join(ROOT, 'static', 'images', 'og');

mkdirSync(OUT_DIR, { recursive: true });

const BG = '#8B4513';
const CREAM = '#F5F0EB';
const GOLD = '#C4A35A';
const MUTED = '#D8CCBC';

function escapeXML(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrap(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildCard(title, category) {
  const maxChars = title.length > 60 ? 30 : 26;
  const fontSize = title.length > 80 ? 58 : title.length > 50 ? 66 : 76;
  const lines = wrap(title, maxChars);
  const lineHeight = Math.round(fontSize * 1.2);
  const titleBlockHeight = lines.length * lineHeight;
  const startY = Math.round((630 - titleBlockHeight) / 2) + fontSize - 10;

  const titleLines = lines
    .map(
      (line, i) =>
        `<text x="80" y="${startY + i * lineHeight}" font-family="Inter, Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="${CREAM}">${escapeXML(line)}</text>`
    )
    .join('');

  const categoryLabel = category
    ? `<text x="80" y="568" font-family="Inter, Helvetica, Arial, sans-serif" font-size="24" font-weight="600" fill="${GOLD}" letter-spacing="2">${escapeXML(category.toUpperCase())}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="${BG}"/>
    <rect x="80" y="540" width="120" height="4" fill="${GOLD}"/>
    ${categoryLabel}

    <g transform="translate(80, 72)">
      <rect width="64" height="64" rx="12" fill="${CREAM}" fill-opacity="0.08"/>
      <rect x="12" y="18" width="40" height="7" rx="2" fill="${CREAM}"/>
      <rect x="10" y="29" width="44" height="7" rx="2" fill="${GOLD}"/>
      <rect x="14" y="40" width="36" height="7" rx="2" fill="${CREAM}"/>
    </g>
    <text x="160" y="115" font-family="Inter, Helvetica, Arial, sans-serif" font-size="24" font-weight="700" fill="${CREAM}" letter-spacing="1">NANOCLAY GUIDE</text>
    <text x="160" y="142" font-family="Inter, Helvetica, Arial, sans-serif" font-size="16" font-weight="400" fill="${MUTED}">nanoclayguide.com</text>

    ${titleLines}
  </svg>`;
}

const files = readdirSync(BLOG_DIR).filter(
  (f) => f.endsWith('.md') && f !== '_index.md'
);

let generated = 0;
for (const file of files) {
  const raw = readFileSync(join(BLOG_DIR, file), 'utf-8');
  const { data } = matter(raw);
  if (data.draft) continue;

  const title = data.seo_title || data.title || file.replace(/\.md$/, '');
  const slug = data.slug || file.replace(/\.md$/, '');
  const category =
    Array.isArray(data.categories) && data.categories.length
      ? data.categories[0]
      : '';

  const svg = buildCard(title, category);
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toFile(join(OUT_DIR, `${slug}.png`));
  generated++;
}

// Default OG image for homepage and non-post pages
const defaultSVG = buildCard('The Definitive Technical Resource for Nanoclay', '');
await sharp(Buffer.from(defaultSVG))
  .png({ compressionLevel: 9 })
  .toFile(join(OUT_DIR, 'default.png'));

console.log(`generated ${generated} post OG images + default.png`);
