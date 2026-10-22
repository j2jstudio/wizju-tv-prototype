// 用无头 Chromium 驱动原型并截图（1920×1080）。先运行 npx vite preview --port 4173
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:4173/';
const out = 'screenshots/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
const wait = (ms) => p.waitForTimeout(ms);
const fid = () => p.evaluate(() => { const els = document.querySelectorAll('[data-focused]'); return (els.length === 1 ? '' : 'COUNT=' + els.length + ' ') + Array.from(els).map((e) => e.dataset.fid).join(','); });
const key = async (k, n = 1, gap = 300) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await wait(gap); } };
const fast = async (k, n) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await wait(110); } await wait(300); };
const shot = async (name) => { await wait(700); await p.screenshot({ path: out + name + '.png' }); console.log('SHOT', name, await fid()); };
const until = async (pred, k, max = 12) => { for (let i = 0; i < max && !pred(await fid()); i++) await key(k); };
const open = async (q) => { await p.goto(URL + q); await wait(900); };
async function toNav() { for (let i = 0; i < 5 && !(await fid()).startsWith('nav:'); i++) await key('Escape', 1, 400); }
async function goNav(id) {
  await toNav();
  const ids = await p.evaluate(() => Array.from(document.querySelectorAll('[data-nav] [data-fid]')).map((e) => e.dataset.fid));
  const d = ids.indexOf('nav:' + id) - ids.indexOf(await fid());
  if (d) await key(d > 0 ? 'ArrowDown' : 'ArrowUp', Math.abs(d), 350);
  await wait(300);
}
async function goTab(nav, tab) {
  await goNav(nav); await key('ArrowRight', 1, 400);
  const tabs = await p.evaluate(() => Array.from(document.querySelectorAll('.sec-tab')).map((e) => e.dataset.fid));
  const d = tabs.indexOf('sec:tab:' + tab) - tabs.indexOf(await fid());
  if (d) await key(d > 0 ? 'ArrowRight' : 'ArrowLeft', Math.abs(d), 400);
  await wait(500);
}

// ---- 配对（Android TV 可导入本地 M3U）----
await open('?autopair=0&fresh=1');
await shot('07-pairing');
await key('ArrowRight', 4);
await shot('07c-pairing-jellyfin');
await key('ArrowLeft', 4);
await key('ArrowDown'); await key('ArrowRight'); await key('Enter', 1, 500);
await shot('07b-pairing-local-m3u-android');

// ---- 首页：跨源聚合 ----
await open('?paired=1&fresh=1');
await key('ArrowRight', 2);
await shot('01-home-android-source-tags');
await key('h');
await key('ArrowDown', 1, 400);
await shot('01b-home-fav-tags-and-my-sources');
await key('ArrowDown', 1, 400); await key('ArrowRight', 3, 300);
await shot('01c-home-my-sources-failing-card');
await key('ArrowUp', 2);

// ---- IPTV：二级行 + 直播 ----
await goNav('iptv'); await key('ArrowRight', 1, 400);
await shot('03-iptv-secondary-row-tab-focus');
await key('ArrowDown', 1, 400); await key('ArrowDown', 4);
await shot('03b-iptv-live-channel-list');
await key('Escape', 1, 400); await key('Escape', 1, 400); await key('ArrowDown', 1, 500);
await shot('20-nav-expanded');
await key('ArrowUp', 1, 400);
// 源面板
await key('ArrowRight', 1, 400); await key('ArrowLeft'); await key('Enter', 1, 500);
await shot('21-iptv-source-panel');
await key('ArrowDown', 3); await key('Enter', 1, 500);
await shot('21b-source-panel-failing-prompt');
await key('Escape'); await key('Escape', 1, 400);
// 节目单 Tab
await goTab('iptv', 'epg'); await key('ArrowDown', 1, 500);
await shot('04-iptv-epg-tab');
await key('ArrowRight', 2); await key('ArrowDown', 2);
await shot('04b-iptv-epg-focus-moved');
// 切到 体育专线，保持节目单
await key('Escape', 1, 400); await fast('ArrowLeft', 2); await key('Enter', 1, 500); await key('ArrowDown'); await key('Enter', 1, 900);
await shot('04c-iptv-switched-source-keeps-epg');

// ---- Emby：服务器返回的媒体库 ----
await goTab('emby', 'movies'); await key('ArrowDown', 2, 400);
await shot('17-emby-movies-libraries');
await goTab('emby', 'music'); await key('ArrowDown', 1, 400);
await shot('17b-emby-music-library');

// ---- 其他：Jellyfin / Plex / 本地媒体 ----
await goTab('other', 'movies'); await key('ArrowDown', 1, 400); await until((f) => f.startsWith('mv:g'), 'ArrowDown', 3); await key('ArrowRight', 1);
await shot('22-other-jellyfin-movies');
await key('Escape', 1, 400); await key('ArrowLeft', 1, 400); await key('Enter', 1, 500);
await shot('22b-other-source-panel');
await key('ArrowDown', 4); await key('Enter', 1, 600);
await shot('22d-plex-device-link');
await key('Escape', 1, 400); await key('ArrowUp', 4);
await key('ArrowDown', 2); await key('Enter', 1, 900);
await shot('22c-other-local-media');

// ---- Xtream：电影 Tab ----
await goTab('xtream', 'movies'); await key('ArrowDown', 1, 400); await until((f) => f.startsWith('mv:g'), 'ArrowDown', 3); await key('ArrowRight', 2);
await shot('16-xtream-movies-tab');
await key('Enter', 1, 700);
await shot('05-movie-detail');
await key('Enter', 1, 1200);
await shot('06-player-controls');
await key('Escape', 1, 600);
await shot('06c-player-skip-intro-hint');
await key('ArrowRight', 2, 200);
await shot('10-player-seek-osd');
await wait(1400);
await key('Enter', 1, 400); await key('ArrowRight', 4); await key('Enter', 1, 500);
await shot('06b-player-subtitle-panel');
await key('Escape'); await key('Escape'); await key('Escape', 1, 600);
await key('Enter', 1, 1000);
await key('Escape'); await key('Escape', 1, 600);
await shot('05b-movie-detail-resume-button');
await key('Escape', 1, 500);

// ---- 直播播放器 ----
await goTab('iptv', 'live');
await key('ArrowDown', 1, 400); await key('ArrowDown', 2);
await key('Enter', 1, 1200);
await shot('11-live-player-zap-banner');
await key('ArrowRight');
await shot('13-live-player-info-bar');
await key('Enter', 1, 400); await key('ArrowDown', 2);
await shot('12-live-player-channel-list');
await key('ArrowRight');
await shot('12b-live-channel-list-shortcuts');
await key('Escape'); await key('Escape', 1, 500);

// ---- 搜索 ----
await goNav('search'); await key('ArrowRight');
const typeKey = async (ch) => {
  const k = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
  const target = k.indexOf(ch);
  for (let g = 0; g < 20; g++) {
    const cur = k.indexOf((await fid()).replace('search:k:', ''));
    if (cur === target || cur < 0) break;
    const cr = Math.floor(cur / 6), cc = cur % 6, tr = Math.floor(target / 6), tc = target % 6;
    await key(tr > cr ? 'ArrowDown' : tr < cr ? 'ArrowUp' : tc > cc ? 'ArrowRight' : 'ArrowLeft', 1, 120);
  }
  await key('Enter');
};
await until((f) => /search:k:[A-F]$/.test(f), 'ArrowUp', 8);
for (const ch of 'CAYX') await typeKey(ch);
await shot('14-search');

// ---- 设置：导航模式 + 播放源管理 ----
await goNav('settings'); await key('ArrowRight', 1, 400);
await until((f) => f === 'set:navmode', 'ArrowDown', 8);
await shot('15-settings-nav-mode');
await key('Enter', 1, 500);
await shot('15b-settings-nav-mode-picker');
await key('Escape');
await key('ArrowDown', 5);
await shot('15c-settings-source-management');

// ---- 退出确认 ----
await goNav('home'); await key('Escape', 1, 500);
await shot('08-exit-dialog');
await key('Escape');

// ---- 合并模式（?livemerge=1）----
await open('?paired=1&fresh=1&hints=0&livemerge=1');
await goNav('live');
await shot('18-merged-mode-nav');
await key('ArrowRight', 1, 400); await key('ArrowLeft'); await key('Enter', 1, 500);
await shot('18b-merged-mode-source-panel');
await key('ArrowDown', 4); await key('Enter', 1, 900);
await shot('18c-merged-mode-xtream-tabs');

// ---- 没有任何源 ----
await open('?paired=1&fresh=1&hints=0&nosrc=1');
await key('Escape', 1, 400);
await shot('19-no-sources-nav');

// ---- tvOS 风格 ----
await open('?paired=1&fresh=1&hints=0&platform=tvos');
await key('ArrowRight', 2);
await shot('02-home-tvos');
await goNav('emby');
await shot('02b-tvos-nav-expanded');
await key('ArrowRight', 1, 400); await key('ArrowDown', 2, 400);
await shot('02c-tvos-emby-movies');
await goTab('iptv', 'live'); await key('ArrowLeft'); await key('Enter', 1, 500);
await shot('02d-tvos-source-panel');

console.log('ERRORS', errors);
await b.close();
