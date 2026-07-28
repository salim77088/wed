// Copy static assets (newtab.html, settings.html) to dist/ after vite build.
// Vite copies public/ automatically, but we want to be explicit and rename for clarity.

const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const DIST_DIR = path.join(__dirname, "..", "dist");

if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

const filesToCopy = ["newtab.html"];

for (const file of filesToCopy) {
  const src = path.join(PUBLIC_DIR, file);
  const dest = path.join(DIST_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`[copy-assets] Copied ${src} -> ${dest}`);
  } else {
    console.warn(`[copy-assets] Missing ${src}`);
  }
}

// Make sure dist has index.html (vite should put it there)
if (!fs.existsSync(path.join(DIST_DIR, "index.html"))) {
  console.error("[copy-assets] FATAL: dist/index.html missing. Vite build failed?");
  process.exit(1);
}
console.log("[copy-assets] All assets in place.");
