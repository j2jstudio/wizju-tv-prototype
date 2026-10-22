import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CHANNELS, fmtTime, programsOf, type Program } from '../data';
import { engine } from '../engine/focus';
import { lastChannel, useApp } from '../store';
import { ChannelLogo } from '../ui/Art';
import { F, FGroup, useKeyHandler, usePageFocus } from '../ui/F';

// 正在播出格宽度不足以放下「时间 + ● 直播中」时只留圆点（v0.2 §6.7）
const LIVE_LABEL_MIN_W = 200;
const PPM = 7; // 每分钟 7px，30 分钟 = 210px
const MIN = 60000;

/** 节目单。sub = 全屏页面（播放器频道列表里的“节目单”）；inline = 源页面里的“节目单”分类 */
export function Epg({ chIds, inline, src }: { chIds?: string[]; inline?: boolean; src?: string }) {
  const app = useApp();
  const CHS = chIds ? chIds.map((id) => CHANNELS.find((c) => c.id === id)!).filter(Boolean) : CHANNELS;
  const now = Date.now();
  const start = Math.floor((now - 90 * MIN) / (30 * MIN)) * 30 * MIN;
  const end = start + 10 * 60 * MIN;
  const rows = useMemo(() => CHS.map((c) => ({ c, ps: programsOf(c).filter((p) => p.end > start && p.start < end) })), [start, end]);
  const [sel, setSel] = useState<Program | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const last = lastChannel(app.recents);
  const pid = (chIdx: number, i: number) => `epg:${chIdx}:${i}`;
  const initial = () => {
    const ri = inline ? 0 : Math.max(0, rows.findIndex((r) => r.c.id === last.id));
    const i = rows[ri].ps.findIndex((p) => p.start <= now && p.end > now);
    return pid(ri, Math.max(0, i));
  };
  const initialId = useMemo(() => initial(), []);
  usePageFocus(inline ? 'epg:' + src : 'page:epg', initial);
  // v0.2：打开时定位到“现在 −30 分钟”
  const [sl, setSl] = useState(((now - 30 * MIN - start) / MIN) * PPM);
  useLayoutEffect(() => {
    const g = gridRef.current; if (!g) return;
    g.scrollLeft = ((now - 30 * MIN - start) / MIN) * PPM;
    const on = () => setSl(g.scrollLeft);
    g.addEventListener('scroll', on, { passive: true });
    return () => g.removeEventListener('scroll', on);
  }, []);

  // 上下键：按“时间光标”跳到相邻频道同一时刻的节目（TiviMate 式）
  const kh = useKeyHandler((k) => {
    if (k.type !== 'dir' || (k.dir !== 'up' && k.dir !== 'down')) return false;
    const cur = engine.current || '';
    const m = /^epg:(\d+):(\d+)$/.exec(cur);
    if (!m) return false;
    const ri = +m[1], pi = +m[2];
    const ti = ri + (k.dir === 'down' ? 1 : -1);
    if (ti >= rows.length) return true;
    if (ti < 0) return !inline; // 内嵌时第一行再按上 → 回到分类 Tab
    const p = rows[ri].ps[pi];
    const viewStart = start + ((gridRef.current?.scrollLeft || 0) / PPM) * MIN;
    const ref = Math.max(p.start, viewStart) + MIN;
    const tps = rows[ti].ps;
    let j = tps.findIndex((q) => q.start <= ref && q.end > ref);
    if (j < 0) j = 0;
    engine.focus(pid(ti, j));
    return true;
  });

  const hours: number[] = [];
  for (let t = start; t < end; t += 30 * MIN) hours.push(t);
  const nowX = ((now - start) / MIN) * PPM;
  const width = ((end - start) / MIN) * PPM;
  const ch = sel ? CHS.find((c) => c.id === sel.chId) : null;
  const isNow = sel && sel.start <= now && sel.end > now;
  return (
    <FGroup id={inline ? 'epg:' + src : 'page:epg'} className={'epg' + (inline ? ' inline' : '')} data-fscope={inline ? undefined : 'sub'} data-fentry={inline ? 'first' : undefined} kh={kh}>
      <div className="epg-head">
        <div className="epg-info">
          <div className="epg-kicker">{ch ? `${ch.num} ${ch.name}` : ''}　{sel ? `${fmtTime(sel.start)} – ${fmtTime(sel.end)} · ${Math.round((sel.end - sel.start) / MIN)} 分钟` : ''}
            {isNow && <span className="badge live-badge">直播中</span>}
            {sel && sel.end <= now && <span className="badge ended-badge">已结束</span>}</div>
          <div className="epg-title">{sel?.title}</div>
          <div className="epg-desc">{sel?.desc}</div>
          {isNow && <div className="progress" style={{ width: 600 }}><i style={{ width: ((now - sel!.start) / (sel!.end - sel!.start)) * 100 + '%' }} /></div>}
        </div>
        <div className="epg-side">
          {!inline && <div className="page-title">节目单</div>}
          <div className="epg-date">今天 {new Date().getMonth() + 1}月{new Date().getDate()}日</div>
          <div className="epg-tip">确认：{isNow ? '立即观看' : sel && sel.start > now ? '预约提醒' : '查看（已结束）'}　长按：收藏频道</div>
        </div>
      </div>
      <div className="epg-grid" ref={gridRef} data-scroll="xy" data-padl="440" data-padr="160" data-pady="60">
        <div className="epg-inner" style={{ width: width + 380 }}>
          <div className="epg-timeline" style={{ width: width + 380 }}>
            <div className="epg-corner">频道</div>
            {hours.map((t) => <div key={t} className="epg-hour" style={{ left: 380 + ((t - start) / MIN) * PPM, width: 30 * PPM }}>{fmtTime(t)}</div>)}
          </div>
          <div className="epg-now" style={{ left: 380 + nowX }} />
          {rows.map((r, ri) => (
            <div key={r.c.id} className="epg-row">
              <div className="epg-ch"><span className="ch-num">{r.c.num}</span><ChannelLogo c={r.c} size="sm" /><span className="epg-chname">{r.c.name}{app.favs.indexOf(r.c.id) >= 0 && <span className="star">★</span>}</span></div>
              <div className="epg-progs">
                {r.ps.map((p, i) => {
                  const s = Math.max(p.start, start), e = Math.min(p.end, end);
                  const past = p.end <= now, live = p.start <= now && p.end > now;
                  const x = ((s - start) / MIN) * PPM, w = ((e - s) / MIN) * PPM - 6;
                  // 节目开头被频道列遮住时，把文字挪到可视区左侧（不用 sticky，兼容老 TV 浏览器）
                  const tx = Math.max(0, Math.min(sl - x, w - 170));
                  return (
                    <F key={p.id} id={pid(ri, i)} def={!!initialId && pid(ri, i) === initialId} className={'epg-prog' + (past ? ' past' : '') + (live ? ' live' : '')}
                      style={{ left: x, width: w }}
                      onFocus={() => setSel(p)}
                      onOk={() => {
                        if (live) app.play({ kind: 'live', chId: r.c.id, list: CHS.map((c) => c.id), src });
                        else if (p.start > now) app.showToast(`已预约：${fmtTime(p.start)}《${p.title}》开播时提醒`);
                        else app.showToast('已结束（回看将在后续版本支持）');
                      }}
                      onLong={() => app.toggleFav(r.c.id, src)}>
                      <div className="epg-ptitle" style={tx ? { transform: `translateX(${tx}px)` } : undefined}>{p.title}</div>
                      <div className="epg-ptime" style={tx ? { transform: `translateX(${tx}px)` } : undefined}>{fmtTime(p.start)}{past && <span className="epg-ended">已结束</span>}{live && <span className={'epg-live' + (w < LIVE_LABEL_MIN_W ? ' dot-only' : '')}><i className="epg-live-dot" /><span className="epg-live-text">直播中</span></span>}</div>
                    </F>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </FGroup>
  );
}
