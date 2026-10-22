import type { ReactNode } from 'react';
import { CHANNEL_BY_ID, MOVIES, SERIES, parseKey } from '../data';
import { useApp, type App } from '../store';
import { KIND_LABEL, TYPE_ICON, TYPE_LABEL, channelsOfSrc, navTypeOf, ownerOfChannel, ownerOfVod, srcTag, type Src } from '../sources';
import { ChannelCard, ContinueCard, PosterCard } from '../ui/Cards';
import { F, FGroup, usePageFocus } from '../ui/F';
import { Hero } from '../ui/Hero';
import { hero } from '../ui/hero';
import { Icon } from '../ui/Icons';
import { engine } from '../engine/focus';

/** 横向行：一个 FocusGroup（记住行内上次焦点），横向滚动 */
export function Row({ id, title, children, className }: { id: string; title: string; children: ReactNode; className?: string }) {
  return (
    <div className={'row ' + (className || '')} data-row>
      <div className="row-title">{title}</div>
      <div className="row-track" data-scroll="x"><FGroup id={id} className="row-inner">{children}</FGroup></div>
    </div>
  );
}

/** 进入某个源：切到对应类型 + 源，焦点落在内容区第一个元素 */
export function openSource(app: App, s: Src) {
  const t = navTypeOf(s.kind, app.merged);
  app.selectSource(t, s);
  engine.blur();
  app.setTab(t);
}

function SourceCard({ s, id }: { s: Src; id: string }) {
  const app = useApp();
  const t = navTypeOf(s.kind, app.merged);
  const hue = { m3u: 210, xtream: 280, stalker: 30, emby: 140, jellyfin: 260, plex: 40, local: 190 }[s.kind];
  return (
    <F id={id} className={'card libcard srccard' + (s.failing ? ' failing' : '')}
      onFocus={() => hero.set({ kind: 'lib', kicker: '我的源 · ' + TYPE_LABEL[t], title: s.name, desc: `${KIND_LABEL[s.kind]} · ${s.failing ? '⚠ 连接失败，按确认进入后可重试或编辑' : s.count}　${s.addr}`, hue })}
      onOk={() => openSource(app, s)}>
      <div className="lib-bg" style={{ background: `linear-gradient(135deg, hsl(${hue} 55% 34%), hsl(${(hue + 60) % 360} 55% 14%))` }} />
      <div className="srccard-top"><Icon name={TYPE_ICON[navTypeOf(s.kind, false)]} size={34} /><small>{KIND_LABEL[s.kind]}</small></div>
      <b>{s.failing ? '⚠ ' : ''}{s.name}</b>
      <small className="srccard-count">{s.failing ? '连接失败' : s.count}</small>
    </F>
  );
}

// v0.2 §4 / v0.3 §3 首页（跨源聚合）
export function Home() {
  const app = useApp();
  const rows: { title: string; cls?: string; nodes: ReactNode[] }[] = [];
  const tagVod = (k: string) => { const o = ownerOfVod(app.sources, k.split(':')[0]); return o ? srcTag(o) : undefined; };
  // 只汇总仍然存在的源里的内容（源被删除后，它的继续观看也不再显示）
  const cw = app.cw.filter((k) => tagVod(k));
  if (cw.length) rows.push({ title: '继续观看 · 下一集', cls: 'row-wide', nodes: cw.map((k, j) => <ContinueCard key={k} k={k} id={`home:r0:${j}`} tag={tagVod(k)} />) });
  const ri = () => rows.length;
  const favCh = app.favs.filter((f) => f[0] === 'c').map((f) => {
    const c = CHANNEL_BY_ID.get(f);
    const s = app.sources.find((x) => x.id === app.favSrc[f] && x.chIds.indexOf(f) >= 0) || ownerOfChannel(app.sources, f);
    return c && s ? { c, s } : null;
  }).filter(Boolean) as { c: NonNullable<ReturnType<typeof CHANNEL_BY_ID.get>>; s: Src }[];
  if (app.sources.length) { const i = ri(); rows.push({
    title: '收藏频道', cls: 'row-ch',
    nodes: favCh.length ? favCh.map(({ c, s }, j) => <ChannelCard key={c.id} c={c} id={`home:r${i}:${j}`} list={channelsOfSrc(s).map((x) => x.id)} src={s.id} tag={srcTag(s)} />)
      : [<F key="empty" id={`home:r${i}:0`} className="card chcard empty-card"
          onFocus={() => hero.set({ kind: 'lib', title: '还没有收藏频道', desc: '在直播页聚焦任意频道，长按确认键即可收藏。', hue: 200 })}
          onOk={() => { const s = app.sources.find((x) => x.chIds.length); if (s) openSource(app, s); }}>
          <Icon name="favorites" size={44} /><b>长按确认收藏频道</b><small>按确认去直播</small>
        </F>],
  }); }
  if (app.sources.length) { const i = ri(); rows.push({ title: '我的源', cls: 'row-lib', nodes: app.sources.map((s, j) => <SourceCard key={s.id} s={s} id={`home:r${i}:${j}`} />) }); }
  else { const i = ri(); rows.push({ title: '我的源', cls: 'row-lib', nodes: [
    <F key="add" id={`home:r${i}:0`} className="card libcard srccard add-card" onFocus={() => hero.set({ kind: 'lib', kicker: '我的源', title: '添加第一个播放源', desc: 'IPTV（M3U）、Xtream Codes、Emby、Stalker Portal……用手机扫码填写。', hue: 220 })}
      onOk={() => app.setTab('add')}><b>＋ 添加播放源</b></F>] }); }
  const vodIds = new Set(app.sources.filter((s) => !s.failing).flatMap((s) => [...s.mvIds, ...s.srIds]));
  const newMv = [...MOVIES].filter((v) => vodIds.has(v.id)).sort((a, b) => b.added - a.added).slice(0, 14);
  const newSr = [...SERIES].filter((v) => vodIds.has(v.id)).sort((a, b) => b.added - a.added).slice(0, 12);
  if (newMv.length) { const i = ri(); rows.push({ title: '最近添加 · 电影', nodes: newMv.map((v, j) => <PosterCard key={v.id} v={v} id={`home:r${i}:${j}`} />) }); }
  if (newSr.length) { const i = ri(); rows.push({ title: '最近添加 · 剧集', nodes: newSr.map((v, j) => <PosterCard key={v.id} v={v} id={`home:r${i}:${j}`} />) }); }

  usePageFocus('page:home', () => 'home:r0:0');
  const first = cw[0] ? parseKey(cw[0]).v : null;
  return (
    <div className="page home">
      <Hero initial={first ? { kind: 'vod', v: first } : { kind: 'lib', kicker: 'wizju', title: '欢迎使用 wizju', desc: '添加 IPTV、Xtream、Emby 等播放源后，这里会汇总所有源的继续观看、收藏频道和最近添加。', hue: 220 }} />
      <div className="rows" data-scroll="y" data-ystart="" data-yoff="0">
        {rows.map((r, i) => <Row key={r.title} id={`home:r${i}`} title={r.title} className={r.cls}>{r.nodes}</Row>)}
        <div className="rows-end" />
      </div>
    </div>
  );
}
