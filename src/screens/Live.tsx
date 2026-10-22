import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { engine } from '../engine/focus';
import { CHANNEL_BY_ID, LIVE_CATS, fmtTime, nowNext, type Channel } from '../data';
import { useApp } from '../store';
import { channelsOfSrc, type Src } from '../sources';
import { ChannelLogo, FakeVideo } from '../ui/Art';
import { F, FGroup, usePageFocus } from '../ui/F';
import { Sentinel, useInView } from '../ui/Lazy';

const mem: Record<string, string> = {};
export function channelsFor(cat: string, favs: string[], recents: string[], all: Channel[]): Channel[] {
  const inSrc = (c: Channel | undefined) => !!c && all.indexOf(c) >= 0;
  if (cat === '全部') return all;
  if (cat === '收藏') return favs.filter((f) => f[0] === 'c').map((f) => CHANNEL_BY_ID.get(f)!).filter(inSrc);
  if (cat === '最近观看') return recents.map((f) => CHANNEL_BY_ID.get(f)!).filter(inSrc);
  return all.filter((c) => c.cats.indexOf(cat) >= 0);
}

/** 直播分类：分组 / 频道列表 / 预览（当前源的频道） */
export function Live({ src }: { src: Src }) {
  const app = useApp();
  const all = channelsOfSrc(src);
  const cats = LIVE_CATS.filter((c) => c === '全部' || c === '收藏' || c === '最近观看' || all.some((x) => x.cats.indexOf(c) >= 0));
  const [cat, setCat] = useState(mem[src.id] && cats.indexOf(mem[src.id]) >= 0 ? mem[src.id] : '全部');
  const list = channelsFor(cat, app.favs, app.recents, all);
  const [pv, setPv] = useState<Channel | null>(list[0] || null);
  const pvTimer = useRef(0);
  useEffect(() => { mem[src.id] = cat; }, [cat]);
  const g = `live:${src.id}`;
  useLayoutEffect(() => { engine.memory.set(g + ':cat', 'live:cat:' + cat); }, []);
  usePageFocus(g, () => `live:ch:${cat}:${list[0]?.id}`);
  const ids = list.map((c) => c.id);
  const pvNow = pv ? nowNext(pv) : null;
  return (
    <FGroup id={g} className="live">
      <FGroup id={g + ':cat'} className="live-cats" scroll="y">
        {cats.map((c) => (
          <F key={c} id={'live:cat:' + c} className={'list-item' + (c === cat ? ' sel' : '')} onFocus={() => setCat(c)}>
            <span>{c}</span><small>{channelsFor(c, app.favs, app.recents, all).length}</small>
          </F>
        ))}
      </FGroup>
      <FGroup id={`${g}:ch:${cat}`} className="live-list" scroll="y" data-pady="90" key={cat}>
        {list.length === 0 && <div className="empty small">{cat === '收藏' ? '这个源里还没有收藏频道：聚焦频道后长按确认键即可收藏' : '暂无频道'}</div>}
        {list.map((c, i) => (
          <F key={c.id} id={`live:ch:${cat}:${c.id}`} def={i === 0} className={'ch-row' + (pv && pv.id === c.id ? ' pv' : '')}
            onFocus={() => { clearTimeout(pvTimer.current); pvTimer.current = window.setTimeout(() => setPv(c), 250); }}
            onOk={() => app.play({ kind: 'live', chId: c.id, list: ids, src: src.id })}
            onLong={() => app.toggleFav(c.id, src.id)}>
            <ChRow c={c} fav={app.favs.indexOf(c.id) >= 0} />
          </F>
        ))}
      </FGroup>
      <div className="live-preview">
        {pv && (
          <>
            <div className="pv-video">
              {app.settings.preview ? <FakeVideo seed={pv.num} hue={pv.hue} playing={!app.player} /> : <div className="pv-off"><ChannelLogo c={pv} size="lg" /><small>预览小窗已关闭（设置中可开启）</small></div>}
              <div className="pv-tag"><span className="live-dot" />{pv.num} {pv.name}</div>
            </div>
            {pvNow?.now && (
              <div className="pv-info">
                <div className="pv-label">正在播出 · {fmtTime(pvNow.now.start)}–{fmtTime(pvNow.now.end)}</div>
                <div className="pv-title">{pvNow.now.title}</div>
                <div className="progress"><i style={{ width: ((Date.now() - pvNow.now.start) / (pvNow.now.end - pvNow.now.start)) * 100 + '%' }} /></div>
                <div className="pv-desc">{pvNow.now.desc}</div>
                {pvNow.next && <div className="pv-next">稍后 {fmtTime(pvNow.next.start)}　{pvNow.next.title}</div>}
              </div>
            )}
            <div className="pv-hint">{src.name} · {src.count}　确认：全屏播放　长按：收藏</div>
          </>
        )}
      </div>
    </FGroup>
  );
}

/** 频道行内容：进入视口才加载 Logo 和“正在播出”（列表本身按需构建，Flutter：ListView.builder） */
function ChRow({ c, fav }: { c: Channel; fav: boolean }) {
  const [r, inView] = useInView('ch:' + c.id);
  const now = inView ? nowNext(c).now : null;
  const pct = now ? ((Date.now() - now.start) / (now.end - now.start)) * 100 : 0;
  return (
    <>
      <Sentinel r={r} />
      <span className="ch-num">{c.num}</span>
      {inView ? <ChannelLogo c={c} size="sm" /> : <div className="ch-logo ch-logo-sm skel" />}
      <div className="ch-text">
        <div className="ch-name">{c.name}{fav && <span className="star">★</span>}{c.badge === '4K' && <span className="badge">4K</span>}</div>
        <div className="ch-now">{inView ? now?.title : <span className="skel-line" />}</div>
        <div className="progress thin"><i style={{ width: pct + '%' }} /></div>
      </div>
    </>
  );
}
