import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const rootDir    = path.resolve(__dirname, "..");

// ── Env helpers ──────────────────────────────────────────────────────
function parseEnv(raw) {
  const map = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val   = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    map[key] = val;
  }
  return map;
}
function normalizeUrl(v) {
  if (!v) return "";
  return v.startsWith("http://") || v.startsWith("https://") ? v : `https://${v}`;
}
async function loadEnvFile() {
  try { return parseEnv(await fs.readFile(path.join(rootDir, ".env"), "utf8")); }
  catch { return {}; }
}

// ── SVG canvas ───────────────────────────────────────────────────────
const MARGIN = 48;   // quiet zone padding around QR
const QR_SZ  = 720;  // QR area size in px
const W      = QR_SZ + MARGIN * 2;
const H      = W;
const CX     = W / 2;
const CY     = H / 2;

// ── Middle finger icon (fa6-solid hand-middle-finger) ────────────────
const HAND_PATH = "M232 0c-22.1 0-40 17.9-40 40v164.2c-8.5-7.6-19.7-12.2-32-12.2c-26.5 0-48 21.5-48 48v80c0 8.8-7.2 16-16 16s-16-7.2-16-16v-55.7c-2 1.4-3.9 3-5.8 4.5l-19.2 16C40.4 297 32 315 32 334v38c0 38 16.9 74 46.1 98.3l5.4 4.5c28.8 24 65 37.1 102.4 37.1l118.1.1c70.7 0 128-57.3 128-128v-96c0-26.5-21.5-48-48-48c-12.4 0-23.6 4.7-32.1 12.3C350 227.5 329.3 208 304 208c-12.3 0-23.5 4.6-32 12.2V40c0-22.1-17.9-40-40-40";
// Original viewBox: 448 × 512
const HAND_VB_W = 448, HAND_VB_H = 512;

// Icon occupies ~28% of QR area (well within H-level 30% tolerance)
const ICON_FRAC  = 0.28;
const ICON_W     = QR_SZ * ICON_FRAC;
const ICON_H     = ICON_W * (HAND_VB_H / HAND_VB_W); // keep aspect ratio
// Center the icon
const ICON_X     = CX - ICON_W / 2;
const ICON_Y     = CY - ICON_H / 2;
// Scale factor to map 448×512 → ICON_W × ICON_H
const HAND_SX    = ICON_W / HAND_VB_W;
const HAND_SY    = ICON_H / HAND_VB_H;
// Background clear zone (slightly bigger than the icon)
const CLR_PAD    = 12;

function buildSVG(url) {
  // Raw QR data matrix (error-correction H = 30% recovery)
  const qr    = QRCode.create(url, { errorCorrectionLevel: "H" });
  const mods  = qr.modules;
  const count = mods.size;
  const ms    = QR_SZ / count;
  const pad   = ms * 0.08;
  const inner = (ms - 2 * pad).toFixed(1);
  const rxMod = (ms * 0.28).toFixed(1);

  const qrRects = [];
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (mods.data[row * count + col] === 1) {
        const x = (MARGIN + col * ms + pad).toFixed(1);
        const y = (MARGIN + row * ms + pad).toFixed(1);
        qrRects.push(`<rect x="${x}" y="${y}" width="${inner}" height="${inner}" rx="${rxMod}"/>`);
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- 1. Background -->
  <rect width="${W}" height="${H}" fill="#060606"/>

  <!-- 2. Full square QR (keeps all finder/alignment patterns intact → scannable) -->
  <g fill="#e01818" filter="url(#glow)">
    ${qrRects.join("\n    ")}
  </g>

  <!-- 3. Clear zone behind the hand icon so QR modules don't clash -->
  <rect x="${ICON_X - CLR_PAD}" y="${ICON_Y - CLR_PAD}"
        width="${ICON_W + CLR_PAD * 2}" height="${ICON_H + CLR_PAD * 2}"
        rx="16" fill="#060606"/>

  <!-- 4. Middle finger icon (centered, red, matching QR style) -->
  <path d="${HAND_PATH}" fill="#e01818"
        transform="translate(${ICON_X.toFixed(1)},${ICON_Y.toFixed(1)}) scale(${HAND_SX.toFixed(4)},${HAND_SY.toFixed(4)})"/>

  <!-- 5. Subtle outline around the icon -->
  <path d="${HAND_PATH}" fill="none" stroke="#6e1515" stroke-width="${(2 / HAND_SX).toFixed(1)}"
        transform="translate(${ICON_X.toFixed(1)},${ICON_Y.toFixed(1)}) scale(${HAND_SX.toFixed(4)},${HAND_SY.toFixed(4)})"/>
</svg>`;
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const fileEnv = await loadEnvFile();
  const runtime = process.env;

  const candidates = [
    runtime.NEXT_PUBLIC_SITE_URL, runtime.SITE_URL, runtime.APP_URL,
    runtime.WEBSITE_URL,          runtime.VERCEL_URL,
    fileEnv.NEXT_PUBLIC_SITE_URL, fileEnv.SITE_URL, fileEnv.APP_URL,
    fileEnv.WEBSITE_URL,          fileEnv.VERCEL_URL,
  ];
  const targetUrl = candidates.map(normalizeUrl).find(Boolean) ?? "http://localhost:3000";

  const svg    = buildSVG(targetUrl);
  const outDir = path.join(rootDir, "public");
  await fs.mkdir(outDir, { recursive: true });

  // Always write SVG (pure JS, no extra deps)
  const svgPath = path.join(outDir, "website-qr.svg");
  await fs.writeFile(svgPath, svg, "utf8");
  console.log(`SVG generated : ${svgPath}`);

  // Also try PNG via sharp (installed automatically by Next.js)
  try {
    const sharp   = (await import("sharp")).default;
    const pngPath = path.join(outDir, "website-qr.png");
    await sharp(Buffer.from(svg)).png().toFile(pngPath);
    console.log(`PNG generated : ${pngPath}`);
  } catch {
    console.log(`PNG skipped   — open website-qr.svg in a browser to print / scan`);
  }

  console.log(`Target URL    : ${targetUrl}`);
}

main().catch((err) => {
  console.error("Failed to generate QR:", err);
  process.exit(1);
});
