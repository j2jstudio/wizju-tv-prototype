import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CHANNELS } from './data';
import { engine, type Dir, type RKey } from './engine/focus';
import { AppProvider, TAB_LABEL, flags, isSrcTab, lastChannel, useApp, type Tab } from './store';
import { TYPE_ICON, TYPE_LABEL, shortName } from './sources';
import { F, FGroup, useFocusWithin, useKeyHandler, useScope } from './ui/F';
import { Icon } from './ui/Icons';
import { Home } from './screens/Home';
import { Epg } from './screens/Epg';
import { SourcePage, goAdd } from './screens/SourcePage';
import { Detail } from './screens/Detail';
import { Player } from './screens/Player';
import { Search } from './screens/Search';
import { SettingsPage } from './screens/Settings';
import { Pairing } from './screens/Pairing';

type Raw = Dir | 'ok' | 'back' | 'playpause' | 'hint' | 'plat' | { d: number };
function mapKey(e: KeyboardEvent): Raw | null {
  const k = e.key, c = e.keyCode;
  if (k === 'ArrowUp' || k === 'Up' || c === 38) return 'up';
  if (k === 'ArrowDown' || k === 'Down' || c === 40) return 'down';
  if (k === 'ArrowLeft' || k === 'Left' || c === 37) return 'left';
  if (k === 'ArrowRight' || k === 'Right' || c === 39) return 'right';
  if (k === 'Enter' || k === 'Select' || c === 13 || c === 23) return 'ok';
  if (k === 'Escape' || k === 'Backspace' || k === 'GoBack' || k === 'BrowserBack' || k === 'Back' || [4, 8, 27, 461, 10009].indexOf(c) >= 0) return 'back';
  if (k === 'MediaPlayPause' || k === 'MediaPlay' || k === 'MediaPause' || c === 179 || c === 415 || c === 19) return 'playpause';
  if (/^[0-9]$/.test(k)) return { d: +k };
  if (c >= 96 && c <= 105) return { d: c - 96 };
  if (k === 'h' || k === 'H') return 'hint';
  if (k === 'p' || k === 'P') return 'plat';
  return null;
}

export default function App() {
  return <AppProvider><Stage /></AppProvider>;
}

function Stage() {
  const app = useApp();
  const stageRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ s: 1, x: 0, y: 0 });
  const appRef = useRef(app); appRef.current = app;
  const [digits, setDigits] = useState('');
  const [ready, setReady] = useState(false);
  const digitRef = useRef({ buf: '', timer: 0 });

  useLayoutEffect(() => {
    const fit = () => {
      const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      engine.scale = s;
      setBox({ s, x: (window.innerWidth - 1920 * s) / 2, y: (window.innerHeight - 1080 * s) / 2 });
    };
    fit();
    engine.attach(stageRef.current!);
    setReady(true);
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    const ok = { down: false, fired: false, timer: 0 };
    let lastBack = 0, guard = false;
    const pushGuard = () => { if (guard) return; try { history.pushState({ wz: 1 }, '', location.href); guard = true; } catch { /* file:// 等环境 */ } };
    pushGuard();
    // 按键分发：先从焦点节点向上冒泡（各页面 / 浮层自己的处理），没人处理再走默认行为
    const dispatch = (k: RKey) => { if (!engine.bubble(k)) defaultKey(k); };
    const commitDigits = () => {
      const n = +digitRef.current.buf;
      digitRef.current.buf = ''; setDigits('');
      const a = appRef.current;
      const ch = CHANNELS.find((c) => c.num === n);
      if (!ch) { a.showToast(`频道 ${n} 不存在`); return; }
      a.play({ kind: 'live', chId: ch.id, list: CHANNELS.map((c) => c.id) });
    };
    const defaultKey = (k: RKey) => {
      const a = appRef.current;
      if (k.type === 'dir') { engine.move(k.dir); return; }
      if (k.type === 'ok') { engine.activate(); return; }
      if (k.type === 'long') { engine.long(); return; }
      if (k.type === 'digit') {
        // v0.2：数字键仅在直播播放中有效，停顿 1.2 秒后跳台
        if (!(a.player && a.player.kind === 'live')) return;
        const d = digitRef.current;
        d.buf = (d.buf + k.d).slice(-4);
        setDigits(d.buf);
        clearTimeout(d.timer);
        d.timer = window.setTimeout(commitDigits, 1200);
        return;
      }
      if (k.type === 'back') backKey();
    };
    // 返回键 6 级逻辑（v0.2 §2）。第 1、2 级（播放器浮层 / 退出播放）由播放器自己的按键处理完成
    const backKey = () => {
      const a = appRef.current;
      if (a.exited || a.player) return;
      const exitApp = () => {
        if (a.settings.platform === 'android') a.setExitDialog(true);       // 6. Android TV：退出确认，默认“取消”
        else a.showToast('已回到 Apple TV 主屏幕（tvOS 原型模拟）');        // 6. tvOS：直接回系统
      };
      if (!a.paired) {                                                   // 3. 配对页：返回上一页（首次启动则视为首页）
        if (flags.pairFromSettings) { flags.pairFromSettings = false; a.setPaired(true); } else exitApp();
        return;
      }
      if (a.stack.length) { a.pop(); return; }                            // 3. 详情页 / 节目单：返回上一页
      const cur = engine.currentEl();
      if (!cur || !cur.closest('[data-nav]')) {
        // 4a.（v0.3）源页面内容区 → 当前分类 Tab
        const tabEl = cur && cur.closest('.src-content') ? document.querySelector<HTMLElement>('.sec-tab.sel') : null;
        if (tabEl && engine.focus(tabEl.dataset.fid!)) return;
        engine.focus('nav:' + a.tab); return;                               // 4b. 分类 Tab / 源按钮 / 其他页面 → 导航当前项
      }
      if (a.tab !== 'home') { engine.focus('nav:home'); return; }         // 5. 导航上且不在首页 → 首页
      exitApp();
    };
    const onDown = (e: KeyboardEvent) => {
      const m = mapKey(e);
      if (!m) return;
      e.preventDefault();
      pushGuard();
      if (m === 'hint') {
        if (e.repeat) return;
        const set = appRef.current.setSettings;
        if (document.querySelector('.hints.fade')) { set((s) => ({ ...s, hints: false })); setTimeout(() => set((s) => ({ ...s, hints: true })), 30); }
        else set((s) => ({ ...s, hints: !s.hints }));
        return;
      }
      if (m === 'plat') {
        if (e.repeat) return;
        const a = appRef.current;
        const np = a.settings.platform === 'android' ? 'tvos' : 'android';
        a.setSettings((s) => ({ ...s, platform: np }));
        a.showToast(np === 'tvos' ? '已切换为 Apple TV（tvOS）风格' : '已切换为 Android TV（Google TV）风格');
        return;
      }
      if (m === 'ok') {
        if (e.repeat || ok.down) return;
        // 只有当前焦点支持长按（收藏）时才延迟判定，其余情况确认键立即生效
        if (!engine.hasLong()) { dispatch({ type: 'ok' }); return; }
        ok.down = true; ok.fired = false;
        ok.timer = window.setTimeout(() => { ok.fired = true; dispatch({ type: 'long' }); }, 600); // v0.2：长按 ≥600ms
        return;
      }
      if (m === 'back') { if (e.repeat) return; lastBack = Date.now(); dispatch({ type: 'back' }); return; }
      if (m === 'playpause') { if (!e.repeat) dispatch({ type: 'playpause' }); return; }
      if (typeof m === 'object') { if (!e.repeat) dispatch({ type: 'digit', d: m.d }); return; }
      dispatch({ type: 'dir', dir: m, repeat: e.repeat });
    };
    const onUp = (e: KeyboardEvent) => {
      if (mapKey(e) !== 'ok' || !ok.down) return;
      clearTimeout(ok.timer); ok.down = false;
      if (!ok.fired) dispatch({ type: 'ok' });
    };
    // Android TV 浏览器的返回键通常会触发 history.back()
    const onPop = () => {
      guard = false;
      pushGuard();
      if (Date.now() - lastBack < 500) return;
      dispatch({ type: 'back' });
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); window.removeEventListener('popstate', onPop); };
  }, []);

  const s = app.settings;
  return (
    <div className="viewport">
      <div ref={stageRef} className={'stage plat-' + s.platform} style={{ transform: `translate(${box.x}px, ${box.y}px) scale(${box.s})` }}>
        {!ready ? null : app.exited ? <Exited /> : !app.paired ? <Pairing /> : <Shell />}
        {app.player && !app.exited && <Player req={app.player} />}
        {app.exitDialog && <ExitDialog />}
        {digits && <div className="digit-osd"><small>跳转频道</small>{digits.padEnd(3, '_')}</div>}
        {app.toast && <div className="toast" key={app.toast.n}>{app.toast.text}</div>}
        {s.hints && <Hints />}
        {s.safeGuides && <div className="safe-guide"><span>5% 安全区</span></div>}
      </div>
    </div>
  );
}

function Shell() {
  const app = useApp();
  const top = app.stack[app.stack.length - 1];
  useEffect(() => { engine.memory.set('nav', 'nav:' + app.tab); }, [app.tab]);
  // 当前类型的源被删光 / 切换导航模式后，该导航项消失 → 回首页
  useEffect(() => { if (app.navTabs.indexOf(app.tab) < 0) app.setTab('home'); }, [app.navTabs.join(), app.tab]);
  useEffect(() => {
    // 设置 › 启动打开 = 上次频道
    if (app.settings.startup === 'last') { const c = lastChannel(app.recents); app.play({ kind: 'live', chId: c.id, list: CHANNELS.map((x) => x.id) }); }
  }, []);
  const prevLen = useRef(app.stack.length);
  useLayoutEffect(() => {
    if (app.stack.length < prevLen.current) {
      const r = app.popped.current;
      app.popped.current = undefined;
      if (!(r && engine.focus(r, { instant: true }))) engine.focusFirst();
    }
    prevLen.current = app.stack.length;
  }, [app.stack.length]);
  // 跨页面落焦点（如 源面板 › 管理源 → 设置里的对应源）
  useLayoutEffect(() => {
    const p = app.pendingFocus.current;
    if (p && p !== 'content' && engine.el(p)) { app.pendingFocus.current = null; engine.focus(p, { instant: true }); }
  });
  const t = app.tab;
  const page = t === 'home' ? <Home /> : t === 'search' ? <Search /> : t === 'settings' ? <SettingsPage /> : t === 'add' ? <AddPage />
    : isSrcTab(t) && app.srcFor(t) ? <SourcePage key={t} t={t} /> : null;
  return (
    <div className="shell">
      <div className="main" style={{ visibility: top ? 'hidden' : undefined }} data-fhidden={top ? '' : undefined}>
        <Nav />
        <FGroup id={'page:' + t} className="content" key={t}>{page}</FGroup>
      </div>
      {top && (top.type === 'detail' ? <Detail key={'d' + top.id + app.stack.length} id={top.id} /> : <Epg key={'epg' + app.stack.length} chIds={top.chIds} />)}
    </div>
  );
}

function AddPage() {
  const app = useApp();
  return (
    <div className="page addpage">
      <div className="add-title">还没有播放源</div>
      <div className="add-text">添加 IPTV（M3U）、Xtream Codes、Emby 或 Stalker Portal 后，左侧导航会出现对应的类型。</div>
      <F id="add:go" className="btn btn-primary" onOk={() => goAdd(app)}>＋ 添加播放源</F>
    </div>
  );
}

const NAV_ICON: Record<string, string> = { home: 'home', add: 'add', search: 'search', settings: 'settings' };
/** 左侧导航（两种风格共用；tvOS 18 起系统也是侧边栏）：收起 96px 只有图标，聚焦时展开到 300px 浮在内容上 */
function Nav() {
  const app = useApp();
  const inNav = useFocusWithin((id) => !!id && id.startsWith('nav:'));
  // 与分类 Tab 相同：焦点停留 300ms 才切换页面；快速经过的导航项不加载内容；右 / 确认立即切换
  const pend = useRef<{ t: number; tab: Tab | null }>({ t: 0, tab: null });
  useEffect(() => {
    const off = engine.subscribe((id) => { const q = pend.current; if (q.tab && id !== 'nav:' + q.tab) { clearTimeout(q.t); q.tab = null; } });
    return () => { off(); clearTimeout(pend.current.t); };
  }, []);
  const focusNav = (t: Tab) => {
    const q = pend.current; clearTimeout(q.t); q.tab = null;
    if (app.tab === t) return;
    q.tab = t; q.t = window.setTimeout(() => { if (q.tab !== t) return; q.tab = null; if (engine.current === 'nav:' + t) app.setTab(t); }, 300);
  };
  const kh = useKeyHandler((k) => {
    const q = pend.current;
    if (!q.tab || !((k.type === 'dir' && k.dir === 'right') || k.type === 'ok')) return false;
    const t = q.tab; clearTimeout(q.t); q.tab = null;
    if (t === 'add') { if (k.type === 'ok') goAdd(app); return true; }
    app.setTab(t);
    const cat = isSrcTab(t) ? app.catFor(t) : undefined;
    if (cat) app.focusAfter('sec:tab:' + cat);
    else requestAnimationFrame(() => requestAnimationFrame(() => engine.move('right')));
    return true;
  });
  return (
    <div className={'rail' + (inNav ? ' open' : '')} data-nav>
      <div className="rail-logo"><b>w</b><span>wizju</span></div>
      <FGroup id="nav" className="nav-items" kh={kh}>
        {app.navTabs.map((t: Tab) => {
          const src = isSrcTab(t) ? app.srcFor(t) : undefined;
          const cat = isSrcTab(t) ? app.catFor(t) : undefined;
          return (
            <F key={t} id={'nav:' + t} className={'nav-item' + (app.tab === t ? ' active' : '')} right={cat ? 'sec:tab:' + cat : undefined}
              onFocus={() => focusNav(t)}
              onOk={() => { if (t === 'add') goAdd(app); else engine.move('right'); }}>
              <Icon name={isSrcTab(t) ? TYPE_ICON[t] : NAV_ICON[t]} size={34} />
              <span className="nav-text"><span className="nav-label">{TAB_LABEL[t]}</span>{src && isSrcTab(t) && <small>{TYPE_LABEL[t]} · {shortName(src.name)}</small>}</span>
            </F>
          );
        })}
      </FGroup>
    </div>
  );
}

function ExitDialog() {
  const app = useApp();
  useScope('exit:cancel');
  const kh = useKeyHandler((k) => { if (k.type === 'back') { app.setExitDialog(false); return true; } return false; });
  return (
    <div className="dim" data-fscope="overlay" {...kh}>
      <div className="dialog">
        <div className="dialog-title">退出 wizju？</div>
        <div className="dialog-text">正在播放的内容和进度会自动保存，下次打开可继续观看。</div>
        <div className="dialog-btns">
          <F id="exit:cancel" className="btn" onOk={() => app.setExitDialog(false)}>取消</F>
          <F id="exit:ok" className="btn" onOk={() => { app.setExitDialog(false); app.closePlayer(); app.setExited(true); }}>退出</F>
        </div>
      </div>
    </div>
  );
}

function Exited() {
  const app = useApp();
  useScope('exited:reopen');
  return (
    <div className="exited" data-fscope="overlay">
      <div className="exited-logo">wizju</div>
      <div className="exited-text">已退出应用（原型模拟：真机会回到 Android TV 主屏幕）</div>
      <F id="exited:reopen" className="btn" onOk={() => { app.setExited(false); engine.blur(); app.setTab('home'); }}>重新打开</F>
    </div>
  );
}

function Hints() {
  // 12 秒后自动淡出，按 H 可重新显示
  const [fade, setFade] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setFade(true), 12000); return () => clearTimeout(t); }, []);
  return (
    <div className={'hints' + (fade ? ' fade' : '')}>
      <span><kbd>↑↓←→</kbd>方向键</span>
      <span><kbd>Enter</kbd>确认（长按 = 收藏）</span>
      <span><kbd>Esc</kbd><kbd>⌫</kbd>返回</span>
      <span><kbd>0-9</kbd>数字跳台</span>
      <span><kbd>P</kbd>切换 Android TV / tvOS</span>
      <span><kbd>H</kbd>隐藏提示</span>
    </div>
  );
}
