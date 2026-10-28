// Render selected timestamps to JPEGs and a contact sheet for review.
// usage: node preview.mjs <outdir> <t1> <t2> ... [--sheet name.jpg] [--cols 3]
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { startServer } from './serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');

const args = process.argv.slice(2);
const out = args.shift();
let sheet = null, cols = 3;
const times = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--sheet') sheet = args[++i];
  else if (args[i] === '--cols') cols = Number(args[++i]);
  else times.push(Number(args[i]));
}
fs.mkdirSync(out, { recursive: true });
const srv = await startServer(0);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
await page.goto(`http://127.0.0.1:${srv.address().port}/web/index.html`);
await page.waitForFunction('window.ready === true || window.loadError', null, { timeout: 180000 });
const err = await page.evaluate(() => window.loadError);
if (err) { console.log('LOAD ERROR', err); process.exit(1); }
const files = [];
for (const t of times) {
  const t0 = Date.now();
  const sid = await page.evaluate((t) => window.renderFrame(t), t);
  const f = path.join(out, `t${t.toFixed(2).padStart(7, '0')}.jpg`);
  await page.screenshot({ path: f, type: 'jpeg', quality: 90 });
  files.push(f);
  console.log(`t=${t} ${sid} ${Date.now() - t0}ms`);
}
await browser.close(); srv.close();
if (sheet) {
  execFileSync('montage', [...files, '-tile', `${cols}x`, '-geometry', '960x540+4+4', '-background', '#333', path.join(out, sheet)]);
  console.log('sheet', path.join(out, sheet));
}
