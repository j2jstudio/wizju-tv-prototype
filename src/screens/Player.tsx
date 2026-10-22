import { useEffect, useRef, useState } from 'react';
import { CHANNEL_BY_ID, fmtDur, fmtTime, nextEpKey, nowNext, parseKey, programsOf } from '../data';
import { engine } from '../engine/focus';
import { useApp, type PlayReq } from '../store';
import { artStyle, ChannelLogo, FakeVideo } from '../ui/Art';
import { F, FGroup, useKeyHandler, useScope } from '../ui/F';
import { Icon } from '../ui/Icons';
import { SidePanel } from '../ui/SidePanel';
import { AUDIO, SUBS, trackPref } from './Detail';

/** 播放器 = 一个覆盖在路由栈之上的模态作用域（Flutter: 全屏 PageRoute + PopScope） */
export function Player({ req }: { req: PlayReq }) {
  return (
    <div className="player" data-fscope="overlay">
      {req.kind === 'live' ? <LivePlayer req={req} /> : <VodPlayer key={req.key + (req.fromStart ? ':0' : '')} req={req} />}
    </div>
  );
}

const QUALITY = ['自动', '原画 4K HDR10（直通）', '1080p · 20 Mbps', '720p · 4 Mbps'];
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SPEED_LABELS = ['0.5×', '0.75×', '1.0×（正常）', '1.25×', '1.5×', '2.0×'];
type MenuId = 'audio' | 'sub' | 'quality' | 'speed';
const INTRO = 90; // 片头 90 秒内可跳过

function fmtDelta(s: number) {
  const a = Math.abs(s), sign = s < 0 ? '−' : '+';
  if (a < 60) return `${sign}${a} 秒`;
  return `${sign}${Math.floor(a / 60)} 分${a % 60 ? ` ${a % 60} 秒` : ''}`;
}

function VodPlayer({ req }: { req: Extract<PlayReq, { kind: 'vod' }> }) {
  const app = useApp();
  const info = parseKey(req.key);
  const dur = info.duration;
  const [pos, setPos] = useState(() => (req.fromStart ? 0 : app.progress[req.key] || 0));
  const posRef = useRef(pos); posRef.current = pos;
  const [playing, setPlaying] = useState(true);
  const [controls, setControls] = useState(true);
  const [menu, setMenu] = useState<MenuId | null>(null);
  const [sel, setSel] = useState({ quality: 0, speed: 2 });
  const [, force] = useState(0);
  const [osd, setOsd] = useState<{ total: number; mult: number; dir: number } | null>(null);
  const hold = useRef({ count: 0, last: 0, total: 0, dir: 0 });
  const hideT = useRef(0), osdT = useRef(0);
  const speed = SPEEDS[sel.speed];
  const nk = nextEpKey(req.key);
  const inIntro = pos < INTRO;

  useScope('pl:pause');
  const showControls = (focusId?: string) => {
    clearTimeout(hideT.current);
    setControls(true);
    if (focusId) engine.focus(focusId);
    hideT.current = window.setTimeout(() => setControls(false), 5000); // 5 秒无操作自动隐藏
  };
  useEffect(() => { showControls(); return () => clearTimeout(hideT.current); }, []);
  useEffect(() => { if (menu) clearTimeout(hideT.current); else if (controls) showControls(); }, [menu]);
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => setPos((p) => Math.min(dur, p + 0.25 * speed)), 250);
    return () => clearInterval(t);
  }, [playing, speed, dur]);
  const close = () => { app.saveProgress(req.key, posRef.current, dur); app.closePlayer(); };
  useEffect(() => { if (pos >= dur) close(); }, [pos >= dur]);

  // 左 −10 秒 / 右 +30 秒：不暂停、不呼出控制条，只显示 1.2 秒进度提示；长按连续 seek 并加速
  const seek = (dir: 'left' | 'right', repeat: boolean) => {
    const h = hold.current, now = Date.now();
    if (repeat) { if (now - h.last < 150) return; h.count++; } else h.count = 0;
    const sgn = dir === 'left' ? -1 : 1;
    const base = dir === 'left' ? 10 : 30;
    const mult = h.count < 3 ? 1 : h.count < 8 ? 3 : h.count < 16 ? 6 : 12;
    const d = sgn * base * mult;
    h.total = now - h.last < 1200 && h.dir === sgn ? h.total + d : d;
    h.dir = sgn; h.last = now;
    setPos((p) => Math.max(0, Math.min(dur - 1, p + d)));
    setOsd({ total: h.total, mult, dir: sgn });
    clearTimeout(osdT.current);
    osdT.current = window.setTimeout(() => setOsd(null), 1200);
  };
  const skipIntro = () => { setPos(INTRO); app.showToast('已跳过片头'); };

  const kh = useKeyHandler((k) => {
    if (menu) return k.type === 'playpause' ? (setPlaying((p) => !p), true) : false;
    if (k.type === 'back') {                     // 返回 1 级：先收起控制条；2 级：退出播放
      if (controls) { clearTimeout(hideT.current); setControls(false); } else close();
      return true;
    }
    if (k.type === 'playpause') { setPlaying((p) => !p); return true; }
    if (!controls) {
      if (k.type === 'dir' && (k.dir === 'left' || k.dir === 'right')) { seek(k.dir, k.repeat); return true; }
      if (k.type === 'dir' && k.dir === 'up') { if (inIntro) skipIntro(); return true; }
      if ((k.type === 'dir' && k.dir === 'down') || k.type === 'ok') { showControls('pl:pause'); return true; } // 默认焦点在暂停键
      return true;
    }
    showControls();
    if (k.type === 'dir' && (k.dir === 'left' || k.dir === 'right') && engine.current === 'pl:bar') { seek(k.dir, k.repeat); return true; }
    return false;
  });

  const pct = (pos / dur) * 100;
  const thumbOn = !!osd || (controls && engine.current === 'pl:bar' && Date.now() - hold.current.last < 1200);
  const thumb = <div className="thumb" style={artStyle((info.v.hue + pos / 20) % 360, info.v.hue2, info.v.variant)}><small>{fmtDur(pos)}</small></div>;
  const menus: Record<MenuId, { title: string; opts: string[]; sel: number; pick: (i: number) => void }> = {
    audio: { title: '音轨', opts: AUDIO, sel: trackPref.audio, pick: (i) => { trackPref.audio = i; force((n) => n + 1); } },
    sub: { title: '字幕', opts: SUBS, sel: trackPref.sub, pick: (i) => { trackPref.sub = i; force((n) => n + 1); } },
    quality: { title: '画质 / 码率', opts: QUALITY, sel: sel.quality, pick: (i) => setSel((s) => ({ ...s, quality: i })) },
    speed: { title: '倍速', opts: SPEED_LABELS, sel: sel.speed, pick: (i) => setSel((s) => ({ ...s, speed: i })) },
  };
  return (
    <div className="pl-root" {...kh}>
      <div className="pl-video"><FakeVideo seed={info.v.hue + info.ep} hue={info.v.hue} playing={playing} /></div>
      {!playing && !controls && <div className="pl-paused"><Icon name="pause" size={80} /></div>}
      {inIntro && !controls && <div className="skip-pill"><kbd>↑</kbd> 按 ↑ 跳过片头</div>}
      {osd && !controls && (
        <div className="seek-osd">
          <div className={'seek-label ' + (osd.dir < 0 ? 'l' : 'r')}>{osd.dir < 0 ? '◀◀ ' : ''}{fmtDelta(osd.total)}{osd.mult > 1 ? `  ×${osd.mult}` : ''}{osd.dir > 0 ? ' ▶▶' : ''}</div>
          <div className="mini-bar"><span>{fmtDur(pos)}</span><div className="progress"><i style={{ width: pct + '%' }} /><b style={{ left: pct + '%' }}>{thumb}</b></div><span>{fmtDur(dur)}</span></div>
        </div>
      )}
      <div className={'pl-controls' + (controls ? ' show' : '')} data-fhidden={controls ? undefined : ''}>
        <div className="pl-top">
          <div className="pl-title">{info.title}</div>
          <div className="pl-sub">{info.sub}　{info.v.badges.map((b) => <span key={b} className="badge">{b}</span>)}</div>
        </div>
        <div className="pl-bottom">
          {inIntro && <div className="pl-skip-row"><F id="pl:skip" className="btn btn-sm" down="pl:bar" onOk={() => { skipIntro(); engine.focus('pl:pause'); }}>跳过片头</F></div>}
          <F id="pl:bar" className="pl-bar" down="pl:pause" onOk={() => setPlaying((p) => !p)}>
            <span className="pl-time">{fmtDur(pos)}</span>
            <div className="progress big"><i style={{ width: pct + '%' }} /><b style={{ left: pct + '%' }}>{thumbOn && thumb}</b></div>
            <span className="pl-time">−{fmtDur(dur - pos)}</span>
          </F>
          <FGroup id="pl:btns" className="pl-btns">
            <F id="pl:pause" className="icon-btn" up="pl:bar" onOk={() => setPlaying((p) => !p)}><Icon name={playing ? 'pause' : 'play'} />{playing ? '暂停' : '播放'}</F>
            <F id="pl:b10" className="icon-btn" up="pl:bar" onOk={() => setPos((p) => Math.max(0, p - 10))}><Icon name="back10" />−10 秒</F>
            <F id="pl:f30" className="icon-btn" up="pl:bar" onOk={() => setPos((p) => Math.min(dur - 1, p + 30))}><Icon name="fwd30" />+30 秒</F>
            <F id="pl:audio" className="icon-btn" up="pl:bar" onOk={() => setMenu('audio')}><Icon name="audio" />音轨</F>
            <F id="pl:sub" className="icon-btn" up="pl:bar" onOk={() => setMenu('sub')}><Icon name="sub" />字幕</F>
            <F id="pl:speed" className="icon-btn" up="pl:bar" onOk={() => setMenu('speed')}><Icon name="speed" />{speed === 1 ? '倍速' : speed + '×'}</F>
            <F id="pl:quality" className="icon-btn" up="pl:bar" onOk={() => setMenu('quality')}><Icon name="quality" />画质</F>
            {nk && <F id="pl:next" className="icon-btn" up="pl:bar" onOk={() => { app.saveProgress(req.key, dur, dur); app.play({ kind: 'vod', key: nk }); }}><Icon name="next" />下一集</F>}
          </FGroup>
        </div>
      </div>
      {menu && <SidePanel id={'pl:menu:' + menu} title={menus[menu].title} onClose={() => setMenu(null)}
        sections={[{ opts: menus[menu].opts, sel: menus[menu].sel, onPick: (i) => { menus[menu].pick(i); app.showToast(`${menus[menu].title}：${menus[menu].opts[i]}`); } }]} />}
    </div>
  );
}

function LivePlayer({ req }: { req: Extract<PlayReq, { kind: 'live' }> }) {
  const app = useApp();
  const [chId, setChId] = useState(req.chId);
  const [banner, setBanner] = useState<'zap' | 'info' | null>('zap');
  const [chList, setChList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reconnect, setReconnect] = useState<number | 'fail' | 0>(0);
  const bT = useRef(0);
  const list = req.list.indexOf(chId) >= 0 ? req.list : [chId, ...req.list];
  const ch = CHANNEL_BY_ID.get(chId)!;
  const { now, next } = nowNext(ch);
  useScope('pl:idle');

  const showBanner = (b: 'zap' | 'info') => {
    setBanner(b);
    clearTimeout(bT.current);
    bT.current = window.setTimeout(() => setBanner(null), 4000); // 信息条 4 秒后隐藏
  };
  const tune = (id: string) => { setChId(id); app.tuneRecent(id); showBanner('zap'); };
  useEffect(() => { if (req.chId !== chId) tune(req.chId); }, [req]);
  useEffect(() => {
    setLoading(true); setReconnect(0);
    const ts = [window.setTimeout(() => setLoading(false), 450)]; // 模拟首帧
    if (ch.unstable) {
      // 断流自动重连 3 次，失败后提示并保留在当前频道
      ts.push(window.setTimeout(() => setReconnect(1), 1500), window.setTimeout(() => setReconnect(2), 3000), window.setTimeout(() => setReconnect(3), 4500),
        window.setTimeout(() => { setReconnect('fail'); app.showToast('重连失败（已重试 3 次），请稍后再试或切换频道'); }, 6000));
    }
    return () => ts.forEach(clearTimeout);
  }, [chId]);
  useEffect(() => { showBanner('zap'); return () => clearTimeout(bT.current); }, []);

  const kh = useKeyHandler((k) => {
    if (chList) return false;
    if (k.type === 'back') { if (banner) { clearTimeout(bT.current); setBanner(null); } else app.closePlayer(); return true; }
    if (k.type === 'dir') {
      if (k.dir === 'up' || k.dir === 'down') {
        if (k.repeat) return true;
        const i = list.indexOf(chId);
        tune(list[(i + (k.dir === 'up' ? -1 : 1) + list.length) % list.length]);
      } else showBanner('info');
      return true;
    }
    if (k.type === 'ok') { clearTimeout(bT.current); setBanner(null); setChList(true); return true; }
    return k.type !== 'digit'; // 数字键交给全局跳台
  });
  const pct = now ? ((Date.now() - now.start) / (now.end - now.start)) * 100 : 0;
  const upcoming = programsOf(ch).filter((p) => p.start >= (next?.start || 0)).slice(0, 3);
  return (
    <div className="pl-root" {...kh}>
      <div className="pl-video"><FakeVideo seed={ch.num} hue={ch.hue} playing={reconnect === 0} /></div>
      <F id="pl:idle" className="pl-idle" />
      <div className="pl-chmark"><ChannelLogo c={ch} size="sm" /></div>
      {loading && <div className="pl-loading"><div className="spinner" /></div>}
      {reconnect !== 0 && <div className="reconnect"><span className="reconnect-icon">!</span>{reconnect === 'fail' ? '信号中断：重连失败，可按 ▲▼ 换台' : `信号中断，正在自动重连（${reconnect}/3）…`}</div>}
      <div className={'live-banner' + (banner && !chList ? ' show' : '') + (banner === 'info' ? ' lb-info' : '')}>
        <div className="lb-left"><div className="lb-num">{ch.num}</div><ChannelLogo c={ch} size="md" /></div>
        <div className="lb-main">
          <div className="lb-name">{ch.name}{ch.badge && <span className="badge">{ch.badge}</span>}{app.favs.indexOf(ch.id) >= 0 && <span className="star">★</span>}</div>
          {now && <div className="lb-now"><span className="live-dot" />现在　{fmtTime(now.start)}–{fmtTime(now.end)}　{now.title}</div>}
          <div className="progress"><i style={{ width: pct + '%' }} /></div>
          {banner === 'info' ? (
            <>
              {now && <div className="lb-desc">{now.desc}</div>}
              <div className="lb-upnext"><span className="lb-k">接下来</span>{upcoming.map((p) => <div key={p.id}><b>{fmtTime(p.start)}</b>{p.title}</div>)}</div>
            </>
          ) : next && <div className="lb-next">接下来 {fmtTime(next.start)}　{next.title}</div>}
        </div>
        <div className="lb-hint">▲▼ 换台　◀▶ 信息　确认：频道列表　数字键：跳台</div>
      </div>
      {chList && <ChannelList list={list} cur={chId} onPick={(id) => { setChList(false); if (id !== chId) tune(id); }} onClose={() => setChList(false)} />}
    </div>
  );
}

/** 直播频道列表浮层：焦点落在当前频道；底部快捷入口 节目单 / 最近观看 / 频道 */
function ChannelList({ list, cur, onPick, onClose }: { list: string[]; cur: string; onPick: (id: string) => void; onClose: () => void }) {
  const app = useApp();
  const [mode, setMode] = useState<'all' | 'recent'>('all');
  const ids = mode === 'recent' ? app.recents : list;
  useScope('pl:cl:' + cur);
  const kh = useKeyHandler((k) => {
    if (k.type === 'back') { onClose(); return true; }
    // 右键：直接跳到底部快捷入口（列表很长时不用一直按到底）
    if (k.type === 'dir' && k.dir === 'right' && (engine.current || '').startsWith('pl:cl:')) { engine.focus(engine.memory.get('pl:cl:sc') || 'pl:sc:epg'); return true; }
    return false;
  });
  return (
    <div className="chlist" data-fscope="overlay" {...kh}>
      <div className="sp-title">{mode === 'recent' ? '最近观看' : '频道列表'}<small>{ids.length} 个</small></div>
      <FGroup id={'pl:cl:list:' + mode} className="chlist-scroll" scroll="y" data-pady="160" key={mode}>
        {ids.map((id) => {
          const c = CHANNEL_BY_ID.get(id)!;
          const { now } = nowNext(c);
          return (
            <F key={id} id={'pl:cl:' + id} className={'ch-row' + (id === cur ? ' pv' : '')} onOk={() => onPick(id)} onLong={() => app.toggleFav(id)}>
              <span className="ch-num">{c.num}</span><ChannelLogo c={c} size="sm" />
              <div className="ch-text"><div className="ch-name">{c.name}{app.favs.indexOf(id) >= 0 && <span className="star">★</span>}</div><div className="ch-now">{now?.title}</div></div>
              {id === cur && <span className="badge live-badge">正在播放</span>}
            </F>
          );
        })}
      </FGroup>
      <FGroup id="pl:cl:sc" className="chlist-sc">
        <F id="pl:sc:epg" className="btn btn-sm" onOk={() => { app.closePlayer(); app.push({ type: 'epg', chIds: list }); }}><Icon name="epg" size={26} />节目单</F>
        <F id="pl:sc:recent" className={'btn btn-sm' + (mode === 'recent' ? ' sel' : '')} onOk={() => { setMode('recent'); setTimeout(() => engine.focusFirst(engine.group('pl:cl:list:recent') || undefined), 0); }}><Icon name="recent" size={26} />最近观看</F>
        <F id="pl:sc:all" className={'btn btn-sm' + (mode === 'all' ? ' sel' : '')} onOk={() => { setMode('all'); setTimeout(() => { if (!engine.focus('pl:cl:' + cur)) engine.focusFirst(); }, 0); }}><Icon name="list" size={26} />频道</F>
      </FGroup>
      <div className="sp-hint">确认：切换　长按：收藏　→ 快捷入口　返回：关闭</div>
    </div>
  );
}

