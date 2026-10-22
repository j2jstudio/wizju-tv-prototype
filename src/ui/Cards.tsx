import { CHANNELS, fmtTime, nowNext, parseKey, type Channel, type Vod } from '../data';
import { useApp } from '../store';
import { Backdrop, ChannelLogo, Poster } from './Art';
import { F } from './F';
import { Icon } from './Icons';
import { hero } from './hero';
import { Sentinel, useInView } from './Lazy';

export function PosterCard({ v, id, def }: { v: Vod; id: string; def?: boolean }) {
  const app = useApp();
  const fav = app.favs.indexOf(v.id) >= 0;
  const [r, inView] = useInView('poster:' + v.id);
  return (
    <F id={id} def={def} className="card poster"
      onFocus={() => hero.set({ kind: 'vod', v })}
      onOk={() => app.push({ type: 'detail', id: v.id })}
      onLong={() => app.toggleFav(v.id)}>
      <Sentinel r={r} />
      {inView ? <Poster v={v} /> : <div className="art poster-art skel" />}
      {fav && <div className="fav-badge"><Icon name="favorites" size={22} /></div>}
      <div className="card-cap">{v.title}</div>
    </F>
  );
}

export function ContinueCard({ k, id, tag }: { k: string; id: string; tag?: string }) {
  const app = useApp();
  const info = parseKey(k);
  const pos = app.progress[k] || 0;
  const left = Math.max(1, Math.round((info.duration - pos) / 60));
  const label = pos > 0 ? `剩余 ${left} 分钟` : '下一集';
  return (
    <F id={id} className="card wide"
      onFocus={() => hero.set({ kind: 'vod', v: info.v, line: info.v.type === 'series' ? info.sub : undefined })}
      onOk={() => app.play({ kind: 'vod', key: k })}
      onLong={() => app.toggleFav(info.v.id)}>
      <Backdrop v={info.v} />
      {tag && <div className="src-tag">{tag}</div>}
      <div className="wide-over">
        <div className="wide-title">{info.title}</div>
        <div className="wide-sub">{info.v.type === 'series' ? `S${info.season} · E${info.ep}  ` : ''}{label}</div>
      </div>
      {pos > 0 ? <div className="progress"><i style={{ width: (pos / info.duration) * 100 + '%' }} /></div> : <div className="next-tag">下一集</div>}
    </F>
  );
}

export function ChannelCard({ c, id, list, tag, src }: { c: Channel; id: string; list?: string[]; tag?: string; src?: string }) {
  const app = useApp();
  const { now } = nowNext(c);
  const fav = app.favs.indexOf(c.id) >= 0;
  const pct = now ? ((Date.now() - now.start) / (now.end - now.start)) * 100 : 0;
  return (
    <F id={id} className="card chcard"
      onFocus={() => hero.set({ kind: 'ch', c })}
      onOk={() => app.play({ kind: 'live', chId: c.id, list: list || CHANNELS.map((x) => x.id), src })}
      onLong={() => app.toggleFav(c.id, src)}>
      <div className="chcard-top"><ChannelLogo c={c} /><div className="chcard-num">{c.num}</div></div>
      <div className="chcard-name">{c.name}</div>
      <div className="chcard-now">{now ? `${fmtTime(now.start)} ${now.title}` : ''}</div>
      <div className="progress thin"><i style={{ width: pct + '%' }} /></div>
      {fav && <div className="fav-badge"><Icon name="favorites" size={22} /></div>}
      {tag && <div className="src-tag">{tag}</div>}
    </F>
  );
}
