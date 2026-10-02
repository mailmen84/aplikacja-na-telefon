// One-off: render src/icons/*.svg to the PNG sizes the manifest needs.
// Run with Playwright available: node scripts/icons.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const jobs = [
  ['src/icons/icon.svg', 'src/icons/icon-192.png', 192],
  ['src/icons/icon.svg', 'src/icons/icon-512.png', 512],
  ['src/icons/maskable.svg', 'src/icons/icon-maskable-512.png', 512],
];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage();
for (const [src, out, size] of jobs) {
  await page.setViewportSize({ width: size, height: size });
  const svg = readFileSync(src, 'utf8').replace('<svg ', `<svg width="${size}" height="${size}" `);
  await page.setContent(`<style>*{margin:0}</style>${svg}`);
  await page.screenshot({ path: out, omitBackground: true });
}
await browser.close();
