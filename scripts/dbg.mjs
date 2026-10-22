// 调试：依次按键并打印焦点；最后截图到 /tmp/dbg.png。用法：node scripts/dbg.mjs [--q=?query] Escape ArrowDown ...
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('pageerror', (e) => console.log('ERR', String(e)));
const wait = (ms) => p.waitForTimeout(ms);
const fid = () => p.evaluate(() => Array.from(document.querySelectorAll('[data-focused]')).map((e) => e.dataset.fid).join(','));
const key = async (k) => { await p.keyboard.press(k); await wait(350); console.log(k, '->', await fid()); };
const args = process.argv.slice(2);
const qa = args.find((a) => a.startsWith('--q='));
await p.goto('http://localhost:4173/' + (qa ? qa.slice(4) : '?paired=1&fresh=1&hints=0'));
await wait(800);
console.log('start', await fid());
for (const k of args.filter((a) => !a.startsWith('--'))) await key(k);
await wait(500);
await p.screenshot({ path: '/tmp/dbg.png' });
await b.close();
