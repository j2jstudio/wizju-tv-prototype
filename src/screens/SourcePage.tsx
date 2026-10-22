import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { engine } from '../engine/focus';
import { flags, useApp } from '../store';
import { CAT_NAMES, KIND_LABEL, TYPE_ICON, TYPE_LABEL, capsOf, navTypeOf, shortName, sourcesOf, type Cat, type NavType, type Src, type SrcKind } from '../sources';
import { F, FGroup, useKeyHandler, useScope } from '../ui/F';
import { Icon } from '../ui/Icons';
import { Live } from './Live';
import { Epg } from './Epg';
import { Library, Music } from './Library';
import { logLoad } from '../ui/Lazy';

function Clock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 10000); return () => clearInterval(i); }, []);
  return <div className="sec-clock">{String(t.getHours()).padStart(2, '0')}:{String(t.getMinutes()).padStart(2, '0')}</div>;
}

/** 管理源：跳到设置 › 播放源管理（单源时源按钮直接打开它） */
export function goManage(app: ReturnType<typeof useApp>, s?: Src) {
  app.focusAfter(s ? 'set:src:' + s.id : 'set:add');
  engine.blur();
  app.setTab('settings');
}
export function goAdd(app: ReturnType<typeof useApp>) { flags.pairFromSettings = true; app.setPaired(false); }

/** v0.3：源类型页面 = 二级行（当前源按钮 + 分类 Tab + 时钟）+ 当前源当前分类的内容 */
export function SourcePage({ t }: { t: NavType }) {
  const app = useApp();
  const list = sourcesOf(app.sources, t, app.merged);
  const src = app.srcFor(t)!;
  const cat = app.catFor(t)!;
  const caps = capsOf(src);
  const [panel, setPanel] = useState(false);
  const [plex, setPlex] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const multi = list.length > 1;
  // 分类 Tab：聚焦 300ms 后才切换内容（快速经过“直播”去源按钮时不会切走当前分类）；按下 / 确认时立即切换
  const tabTimer = useRef<{ t: number; c: Cat | null }>({ t: 0, c: null });
  const flushTab = () => { const p = tabTimer.current; clearTimeout(p.t); if (p.c) { const c = p.c; p.c = null; if (c !== cat) { app.pendingFocus.current = 'content'; app.setCat(t, c); return true; } } return false; };
  const focusTab = (c: Cat) => { const p = tabTimer.current; clearTimeout(p.t); p.c = c; p.t = window.setTimeout(() => { if (p.c !== c) return; p.c = null; if (engine.current === 'sec:tab:' + c) app.setCat(t, c); }, 300); };
  // 焦点在 300ms 内离开该 Tab（快速经过 / 去源按钮 / 回导航）→ 取消待切换，不加载任何内容
  useEffect(() => {
    const off = engine.subscribe((id) => { const p = tabTimer.current; if (p.c && id !== 'sec:tab:' + p.c) { clearTimeout(p.t); p.c = null; } });
    return () => { off(); clearTimeout(tabTimer.current.t); };
  }, []);
  // 内容“加载”只在分类 / 源真正切换时发生一次（测试用日志）
  useEffect(() => { logLoad(`cat:${src.id}:${cat}`); }, [src.id, cat]);
  const secKh = useKeyHandler((k) => {
    // 二级行内左右移动只在这一行里走（不会掉进下方滚动中的内容）；最左再按左 → 导航
    if (k.type === 'dir' && (k.dir === 'left' || k.dir === 'right')) {
      const order = ['sec:src', ...caps.map((c) => 'sec:tab:' + c)];
      const i = order.indexOf(engine.current || '');
      if (i < 0) return false;
      const j = i + (k.dir === 'right' ? 1 : -1);
      if (j < 0) return false;
      if (j < order.length) engine.focus(order[j]);
      return true;
    }
    if ((k.type === 'dir' && k.dir === 'down') || k.type === 'ok') return engine.current?.startsWith('sec:tab:') ? (flushTab() || (k.type === 'ok' && engine.move('down'))) : false;
    return false;
  });
  // 分类 Tab 组的记忆初始化为当前分类：从内容区按上键回到当前 Tab，而不是源按钮
  useLayoutEffect(() => { if (!engine.memory.get('sec:' + t)) engine.memory.set('sec:' + t, 'sec:tab:' + cat); }, []);
  // 切源 / 从首页“我的源”进入：焦点落在内容区第一个元素
  useLayoutEffect(() => {
    if (app.pendingFocus.current !== 'content') return;
    app.pendingFocus.current = null;
    const c = contentRef.current; if (!c) return;
    const all = Array.from(c.querySelectorAll<HTMLElement>('[data-fid]'));
    const d = all.find((e) => e.hasAttribute('data-fdefault')) || all[0];
    if (d) engine.focus(d.dataset.fid!, { instant: true });
  }, [src.id, cat]);
  const content = src.failing ? <Failed src={src} /> : cat === 'live' ? <Live key={src.id} src={src} />
    : cat === 'epg' ? <Epg key={src.id} inline src={src.id} chIds={src.chIds} />
    : cat === 'movies' ? <Library key={src.id + 'm'} type="movie" src={src} />
    : cat === 'series' ? <Library key={src.id + 's'} type="series" src={src} />
    : <Music key={src.id} src={src} />;
  return (
    <div className={'page srcpage cat-' + cat}>
      <FGroup id={'sec:' + t} className="sec-row" data-sec="" kh={secKh}>
        <F id="sec:src" className={'btn src-btn' + (multi ? '' : ' single')} onOk={() => (multi ? setPanel(true) : goManage(app, src))}>
          <Icon name={TYPE_ICON[navTypeOf(src.kind, false)]} size={30} />
          <span className="src-btn-name">{src.failing ? '⚠ ' : ''}{shortName(src.name)}</span>
          {multi && <span className="src-btn-chev"><Icon name="chev" size={26} /></span>}
        </F>
        <div className="sec-tabs">
          {caps.map((c) => (
            <F key={c} id={'sec:tab:' + c} className={'sec-tab' + (c === cat ? ' sel' : '')} onFocus={() => focusTab(c)}>{CAT_NAMES[c]}</F>
          ))}
        </div>
        <div className="sec-right">{new Set(list.map((x) => x.kind)).size > 1 && <span className="sec-kind">{KIND_LABEL[src.kind]}</span>}<Clock /></div>
      </FGroup>
      <div ref={contentRef} className="src-content" key={src.id + ':' + cat}>{content}</div>
      {panel && <SourcePanel t={t} list={list} cur={src} onClose={() => setPanel(false)} onPlex={() => setPlex(true)} />}
      {plex && <PlexLink onClose={() => setPlex(false)} />}
    </div>
  );
}

function Failed({ src }: { src: Src }) {
  const app = useApp();
  return (
    <FGroup id={'failed:' + src.id} className="failed">
      <div className="failed-icon">⚠</div>
      <div className="failed-title">无法连接“{src.name}”</div>
      <div className="failed-text">{src.addr}<br />请检查网络或源地址后重试，也可以切换到其他源。</div>
      <div className="failed-btns">
        <F id="failed:retry" def className="btn" onOk={() => retry(app, src)}>重试</F>
        <F id="failed:edit" className="btn" onOk={() => goManage(app, src)}>编辑源</F>
      </div>
    </FGroup>
  );
}
function retry(app: ReturnType<typeof useApp>, s: Src) {
  app.showToast(`正在重新连接“${s.name}”…`);
  setTimeout(() => app.showToast(`“${s.name}”仍然无法连接（原型模拟）`), 1500);
}

// 名称 + 数量放不下一行时，数量放到名称下面（不截断源名）
const tw = (x: string) => Array.from(x).reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? 1 : 0.56), 0);
const fits = (s: Src) => tw((s.failing ? '⚠ ' : '') + s.name) * 28 + tw(s.failing ? '连接失败' : s.count) * 22 + 12 <= 370;
const GROUP_ORDER: SrcKind[] = ['m3u', 'xtream', 'stalker', 'emby', 'jellyfin', 'plex', 'local'];
/** 源切换面板：从左侧滑出 520px，浮在内容上（Flutter：Overlay 路由 / showGeneralDialog） */
function SourcePanel({ t, list, cur, onClose, onPlex }: { t: NavType; list: Src[]; cur: Src; onClose: () => void; onPlex: () => void }) {
  const app = useApp();
  const [fail, setFail] = useState<Src | null>(null);
  useScope('sp:src:' + cur.id);
  const kh = useKeyHandler((k) => {
    if (k.type === 'back') { if (fail) { setFail(null); setTimeout(() => engine.focus('sp:src:' + fail.id), 0); } else onClose(); return true; }
    return false;
  });
  const kinds = new Set(list.map((s) => s.kind));
  // 一个导航项里有多种源时按类型分组（分开模式 IPTV = M3U / Stalker；合并模式 IPTV = M3U / Xtream / Stalker；其他 = Jellyfin / Plex / 本地媒体）
  const groups = kinds.size > 1 ? GROUP_ORDER.filter((g) => list.some((s) => s.kind === g)) : [null];
  const pick = (s: Src) => {
    if (s.failing) { setFail(s); setTimeout(() => engine.focus('sp:fail:retry'), 0); return; }
    if (s.id === cur.id) { onClose(); return; }
    onClose();
    app.selectSource(t, s);
    app.showToast(`已切换到 ${TYPE_LABEL[navTypeOf(s.kind, app.merged)]} · ${s.name}`);
  };
  const addLabel = t === 'other' ? '＋ 添加其他源' : `＋ 添加 ${TYPE_LABEL[t]} 源`;
  return (
    <div className="src-panel" data-fscope="overlay" {...kh}>
      <div className="sp-title">{t === 'live' ? 'IPTV' : TYPE_LABEL[t] + ' 源'}<small>{list.length} 个</small></div>
      {fail ? (
        <FGroup id="sp:fail" className="sp-fail">
          <div className="sp-fail-title">⚠ “{fail.name}” 连接失败</div>
          <div className="sp-fail-text">{fail.addr}<br />可以重试，或编辑源地址 / 账号。</div>
          <F id="sp:fail:retry" className="list-item" onOk={() => retry(app, fail)}>重试连接</F>
          <F id="sp:fail:edit" className="list-item" onOk={() => { onClose(); goManage(app, fail); }}>编辑源</F>
          <F id="sp:fail:back" className="list-item" onOk={() => { setFail(null); setTimeout(() => engine.focus('sp:src:' + fail.id), 0); }}>返回源列表</F>
        </FGroup>
      ) : (
        <FGroup id="sp:list" className="sp-scroll" scroll="y" data-pady="100">
          {groups.map((g) => (
            <div key={g || 'all'}>
              {g && <div className="sp-section">{KIND_LABEL[g]}</div>}
              {list.filter((s) => !g || s.kind === g).map((s) => (
                <F key={s.id} id={'sp:src:' + s.id} className={'list-item sp-src' + (s.id === cur.id ? ' sel' : '') + (s.failing ? ' failing' : '') + (fits(s) ? '' : ' stack')} onOk={() => pick(s)}>
                  <span className="sp-check">{s.id === cur.id ? <Icon name="check" size={28} /> : null}</span>
                  <span className="sp-name">{s.failing ? '⚠ ' : ''}{s.name}</span>
                  <span className="sp-count">{s.failing ? '连接失败' : s.count}</span>
                </F>
              ))}
            </div>
          ))}
          <div className="sp-divider" />
          <F id="sp:add" className="list-item sp-act" onOk={() => { onClose(); goAdd(app); }}>{addLabel}</F>
          {t === 'other' && <F id="sp:add:plex" className="list-item sp-act" onOk={onPlex}>＋ 添加 Plex</F>}
          <F id="sp:manage" className="list-item sp-act" onOk={() => { onClose(); goManage(app); }}>⚙ 管理源（排序/重命名/删除）</F>
        </FGroup>
      )}
      <div className="sp-hint">确认：切换　返回：关闭</div>
    </div>
  );
}

// Plex 设备关联（Mock）：电视显示 4 位代码，用户在 plex.tv/link 输入；返回键关闭
const PLEX_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function PlexLink({ onClose }: { onClose: () => void }) {
  const [code] = useState(() => Array.from({ length: 4 }, () => PLEX_CHARS[Math.floor(Math.random() * PLEX_CHARS.length)]).join(''));
  useScope('plex:cancel');
  const kh = useKeyHandler((k) => { if (k.type === 'back') { onClose(); return true; } return false; });
  return (
    <div className="plex-link" data-fscope="overlay" {...kh}>
      <div className="plex-logo">PLEX</div>
      <div className="plex-title">关联 Plex 账号</div>
      <div className="plex-code">{code.split('').map((c, i) => <span key={i}>{c}</span>)}</div>
      <div className="plex-text">在手机或电脑上打开 <b>plex.tv/link</b> 输入此代码</div>
      <div className="plex-wait"><div className="spinner sm" />等待关联…（原型模拟，不会真正连接）</div>
      <FGroup id="plex:btns" className="plex-btns">
        <F id="plex:cancel" className="btn" onOk={onClose}>取消</F>
      </FGroup>
      <div className="plex-hint">返回：关闭</div>
    </div>
  );
}
