import { useEffect, useState } from 'react';
import { fmtTime, nowNext } from '../data';
import { artStyle, FakeVideo } from './Art';
import { hero, type HeroInfo } from './hero';

export function Hero({ initial }: { initial?: HeroInfo | null }) {
  const [h, setH] = useState<HeroInfo | null>(hero.get() || initial || null);
  useEffect(() => hero.sub(setH), []);
  if (!h) return <div className="hero" />;
  if (h.kind === 'ch') {
    const { now, next } = nowNext(h.c);
    return (
      <div className="hero">
        <div className="hero-bg"><FakeVideo seed={h.c.num} hue={h.c.hue} /></div>
        <div className="hero-scrim" />
        <div className="hero-text">
          <div className="hero-kicker"><span className="live-dot" />直播 · {h.c.num}</div>
          <div className="hero-title">{h.c.name}</div>
          {now && <div className="hero-meta">正在播出：{now.title}　{fmtTime(now.start)}–{fmtTime(now.end)}</div>}
          {next && <div className="hero-desc">稍后：{fmtTime(next.start)} {next.title}</div>}
        </div>
      </div>
    );
  }
  if (h.kind === 'lib') {
    return (
      <div className="hero">
        <div className="hero-bg" style={artStyle(h.hue, (h.hue + 90) % 360, 4)} />
        <div className="hero-scrim" />
        <div className="hero-text"><div className="hero-kicker">{h.kicker || '媒体库'}</div><div className="hero-title">{h.title}</div><div className="hero-desc">{h.desc}</div></div>
      </div>
    );
  }
  const v = h.v;
  return (
    <div className="hero">
      <div className="hero-bg" style={artStyle(v.hue, v.hue2, v.variant)} />
      <div className="hero-scrim" />
      <div className="hero-text">
        <div className="hero-kicker">{v.type === 'movie' ? '电影' : '剧集'} · {v.genre}</div>
        <div className="hero-title">{v.title}</div>
        <div className="hero-meta">
          <span className="rating">★ {v.rating}</span><span>{v.year}</span>
          {v.type === 'movie' ? <span>{Math.round(v.duration / 60)} 分钟</span> : <span>{v.seasons!.length} 季</span>}
          {v.badges.map((b) => <span key={b} className="badge">{b}</span>)}
        </div>
        {h.line && <div className="hero-line">{h.line}</div>}
        <div className="hero-desc">{v.synopsis}</div>
      </div>
    </div>
  );
}
