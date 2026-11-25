#!/usr/bin/env node
// Capture a live web page for a video: the top of the page at desktop or phone width.
//   node capture.mjs https://example.com --out assets/site-desktop.png [--width 1280] [--height 2400] [--mobile] [--wait 1500]
// --height limits how far down the capture goes: stop above sections that show real people, reviews or private data.
// Run it from a folder where `playwright` is installed (the video project after `npm install`).
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const url = args.find((a) => /^https?:\/\//.test(a));
if (!url) { console.error('usage: capture.mjs <url> --out file.png [--width 1280] [--height 2400] [--mobile] [--wait 1500]'); process.exit(1); }
const mobile = args.includes('--mobile');
const width = +get('width', mobile ? 390 : 1280); const height = +get('height', mobile ? 1600 : 2400);
const out = resolve(get('out', mobile ? 'assets/site-mobile.png' : 'assets/site-desktop.png'));
let chromium; try { ({ chromium } = await import(resolve('node_modules/playwright/index.mjs'))); } catch { ({ chromium } = await import('playwright')); }
mkdirSync(dirname(out), { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width, height: Math.min(height, 1000) }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(+get('wait', 1500));
const full = await p.evaluate(() => document.documentElement.scrollHeight);
await p.screenshot({ path: out, fullPage: true, clip: { x: 0, y: 0, width, height: Math.min(height, full) } });
await b.close();
console.log(`saved ${out} (${width}x${Math.min(height, full)} css px at 2x)`);
