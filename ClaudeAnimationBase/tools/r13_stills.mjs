// tools/r13_stills.mjs — R13 角色静帧导出（不渲整片、不碰 out/frames）
//   · 6 张走路帧：同机位、相位 0,1/6..5/6（LOOPS.dino_r13，walk 由脚本直接给相位）
//   · 12 张表情帧：6 种眼 × 5 种嘴 × 附加物的全部组合
//   · 2 张待机对照组：睁眼 / 眨眼（只差 blink 参数）
//   · 1 张走路条带：6 相位同框（out/r13_walk_strip.png）
// 用法：node tools/r13_stills.mjs [--out=out/r13_stills] [--only=walk|expr|strip]
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const CHROMES = [args.chrome, process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'];
const CHROME = CHROMES.find(p => p && existsSync(p));
if (!CHROME) { console.error('Chrome not found: pass --chrome=<path>'); process.exit(1); }

const OUT = args.out || 'out/r13_stills';
const EXPRS = ['neutral', 'happy', 'laugh', 'cry', 'shock', 'daze', 'dizzy', 'stone', 'smug', 'heart', 'popcorn', 'angry'];
// 待机对照组：睁眼 / 眨眼（同一相位、同一 T，只差 blink 参数）
const IDLES = [{ name: 'idle_open', blink: 0 }, { name: 'idle_blink', blink: 1 }];
const PHASES = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6];

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, protocolTimeout: 0,
  args: ['--allow-file-access-from-files', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-gpu-rasterization',
    '--window-size=1920,1080', '--disable-renderer-backgrounding', '--disable-background-timer-throttling']
});
const page = await browser.newPage();
page.on('console', m => { if (['error', 'warn'].includes(m.type())) console.log('[page]', m.text()); });
page.on('pageerror', e => console.log('[page error]', e.message));
await page.goto(pathToFileURL(resolve('studio.html')).href + '?render', { waitUntil: 'networkidle0', timeout: 180000 });
await page.waitForFunction('window.ready === true', { timeout: 120000 });
console.log('GPU:', await page.evaluate(() => window.gpuInfo()));

const grab = async (loop, t, cfg) => {
  const url = await page.evaluate((loop, t, cfg) => {
    window.LOOP = LOOPS[loop];
    window.R13 = cfg;
    return window.renderAt(t);
  }, loop, t, cfg);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
};

mkdirSync(OUT, { recursive: true });
const only = args.only || 'all';
const manifest = [];
if (only === 'all' || only === 'walk') {
  for (const w of PHASES) {
    const name = 'walk_w' + String(Math.round(w * 1000)).padStart(3, '0');
    // 同一 t（同机位 / 同 boil 相位 / 同压暗状态），只推进步态相位 w → 帧差只来自步态
    const buf = await grab('dino_r13', 0.12, { expr: 'happy', walk: w, blink: 0, label: true });
    writeFileSync(OUT + '/' + name + '.png', buf);
    manifest.push({ name, kind: 'walk', walk: w, t: 0.12 });
    console.log(OUT + '/' + name + '.png  w=' + w.toFixed(4));
  }
}
if (only === 'all' || only === 'expr') {
  for (const e of EXPRS) {
    const name = 'expr_' + e;
    const buf = await grab('dino_r13', 1.0, { expr: e, walk: null, blink: 0, label: true });
    writeFileSync(OUT + '/' + name + '.png', buf);
    manifest.push({ name, kind: 'expr', expr: e, t: 1.0 });
    console.log(OUT + '/' + name + '.png  expr=' + e);
  }
}
if (only === 'all' || only === 'idle') {
  for (const d of IDLES) {
    const buf = await grab('dino_r13', 1.0, { expr: 'happy', walk: null, blink: d.blink, label: true });
    writeFileSync(OUT + '/' + d.name + '.png', buf);
    manifest.push({ name: d.name, kind: 'idle', blink: d.blink, t: 1.0 });
    console.log(OUT + '/' + d.name + '.png  blink=' + d.blink);
  }
}
if (only === 'all' || only === 'strip') {
  const buf = await grab('dino_r13_strip', 0.4, {});
  writeFileSync('out/r13_walk_strip.png', buf);
  console.log('out/r13_walk_strip.png');
}
writeFileSync(OUT + '/manifest.json', JSON.stringify(manifest, null, 2));
await browser.close();
console.log('done · ' + manifest.length + ' stills → ' + OUT);
