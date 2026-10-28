// Render all frames (30 fps x 180 s = 5400) to JPEG with parallel headless Chromium workers.
// usage: node 04_render_frames.mjs <outdir> [workers=3] [first=0] [last=5399]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { startServer } from './serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');

const [out, W = '3', A = '0', B = '5399'] = process.argv.slice(2);
const FPS = 30, workers = Number(W), first = Number(A), last = Number(B);
fs.mkdirSync(out, { recursive: true });
const srv = await startServer(0);
const url = `http://127.0.0.1:${srv.address().port}/web/index.html`;
const n = last - first + 1, per = Math.ceil(n / workers);
const t0 = Date.now();
let done = 0;
async function worker(k) {
  const a = first + k * per, b = Math.min(last, a + per - 1);
  if (a > b) return;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => console.log(`[w${k}] PAGE ERROR`, e.message));
  await page.goto(url);
  await page.waitForFunction('window.ready === true || window.loadError', null, { timeout: 300000 });
  const err = await page.evaluate(() => window.loadError);
  if (err) throw new Error(err);
  for (let f = a; f <= b; f++) {
    const file = path.join(out, `f${String(f).padStart(5, '0')}.jpg`);
    await page.evaluate((t) => window.renderFrame(t), f / FPS);
    await page.screenshot({ path: file, type: 'jpeg', quality: 94 });
    if (++done % 100 === 0) console.log(`${done}/${n} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  await browser.close();
}
await Promise.all([...Array(workers).keys()].map(worker));
srv.close();
console.log(`done ${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
