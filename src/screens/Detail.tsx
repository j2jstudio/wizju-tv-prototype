import { useLayoutEffect, useState } from 'react';
import { MOVIES, SERIES, VOD_BY_ID, fmtDur, parseKey } from '../data';
import { engine } from '../engine/focus';
import { useApp } from '../store';
import { Backdrop, Poster } from '../ui/Art';
import { PosterCard } from '../ui/Cards';
import { F, FGroup, usePageFocus } from '../ui/F';
import { Icon } from '../ui/Icons';
import { SidePanel } from '../ui/SidePanel';
import { Row } from './Home';

export const AUDIO = ['国语 · 杜比数字+ 5.1', '粤语 · AAC 2.0', '英语 · 杜比全景声（直通）'];
export const SUBS = ['关闭', '简体中文', '繁体中文', '英文', '中英双语'];
export const trackPref = { audio: 0, sub: 1 };

// v0.2 §4：详情页第一个按钮“从 xx:xx 继续”（有进度时），然后从头播放、收藏、音轨 / 字幕；剧集季切换聚焦即切
export function Detail({ id }: { id: string }) {
  const app = useApp();
  const v = VOD_BY_ID.get(id)!;
  const fav = app.favs.indexOf(v.id) >= 0;
  const resumeKey = v.type === 'series' ? app.cw.find((k) => k.split(':')[0] === v.id) || `${v.id}:1:1` : v.id;
  const [season, setSeason] = useState(() => (v.type === 'series' ? +resumeKey.split(':')[1] : 1));
  const [panel, setPanel] = useState(false);
  const [, force] = useState(0);
  const pos = app.progress[resumeKey] || 0;
  const se = v.seasons?.[season - 1];
  const pool = v.type === 'movie' ? MOVIES : SERIES;
  const similar = pool.filter((x) => x.id !== v.id && x.genre === v.genre).concat(pool.filter((x) => x.genre !== v.genre)).slice(0, 10);
  useLayoutEffect(() => {
    if (v.type === 'series') {
      engine.memory.set('det:seasons', 'det:season:' + season);
      engine.memory.set('det:eps:' + season, 'det:ep:' + resumeKey);
    }
  }, []);
  usePageFocus('page:detail:' + id, () => 'det:play');
  const [rs, re] = resumeKey.split(':');
  const epTag = v.type === 'series' ? ` · 第${rs}季 第${re}集` : '';
  const playLabel = pos > 0 ? `从 ${fmtDur(pos)} 继续${epTag}` : `播放${epTag}`;
  return (
    <FGroup id={'page:detail:' + id} className="detail" data-fscope="sub">
      <Backdrop v={v} className="detail-bg" />
      <div className="detail-scrim" />
      <div className="detail-scroll" data-scroll="y" data-ystart="" data-yoff="60">
        <section className="d-hero" data-row>
          <div className="d-poster"><Poster v={v} /></div>
          <div className="d-main">
            <div className="d-title">{v.title}</div>
            <div className="hero-meta">
              <span className="rating">★ {v.rating}</span><span>{v.year}</span><span>{v.genre}</span>
              {v.type === 'movie' ? <span>{Math.round(v.duration / 60)} 分钟</span> : <span>{v.seasons!.length} 季 · {v.seasons!.reduce((a, s) => a + s.episodes.length, 0)} 集</span>}
              {v.badges.map((b) => <span key={b} className="badge">{b}</span>)}
            </div>
            <div className="d-syn">{v.synopsis}</div>
            <div className="d-credit">导演：{v.cast[5].name}　主演：{v.cast.slice(0, 3).map((c) => c.name).join(' / ')}</div>
            <FGroup id="det:btns" className="d-btns">
              <F id="det:play" className="btn btn-primary" onOk={() => app.play({ kind: 'vod', key: resumeKey })}><Icon name="play" size={30} />{playLabel}</F>
              {pos > 0 && <F id="det:restart" className="btn" onOk={() => app.play({ kind: 'vod', key: resumeKey, fromStart: true })}>从头播放</F>}
              <F id="det:fav" className="btn" onOk={() => app.toggleFav(v.id)}><Icon name="favorites" size={28} />{fav ? '已收藏' : '收藏'}</F>
              <F id="det:tracks" className="btn" onOk={() => setPanel(true)}><Icon name="sub" size={28} />音轨 / 字幕</F>
            </FGroup>
            {pos > 0 && <div className="d-progress"><div className="progress"><i style={{ width: (pos / parseKey(resumeKey).duration) * 100 + '%' }} /></div></div>}
          </div>
        </section>
        {v.type === 'series' && (
          <>
            <section className="d-sec" data-row>
              <div className="row-title">选季</div>
              <FGroup id="det:seasons" className="chips">
                {v.seasons!.map((s) => (
                  <F key={s.n} id={'det:season:' + s.n} className={'chip' + (s.n === season ? ' sel' : '')} onFocus={() => setSeason(s.n)}>第 {s.n} 季</F>
                ))}
              </FGroup>
            </section>
            <Row id={'det:eps:' + season} title={`第 ${season} 季 · ${se!.episodes.length} 集`} className="d-sec">
              {se!.episodes.map((e) => {
                const k = `${v.id}:${season}:${e.n}`;
                const p = app.progress[k] || 0;
                return (
                  <F key={k} id={'det:ep:' + k} className="card epcard" onOk={() => app.play({ kind: 'vod', key: k })}>
                    <Backdrop v={{ ...v, hue: (v.hue + e.n * 13) % 360, variant: (v.variant + e.n) % 5 }} />
                    <div className="ep-num">{e.n}</div>
                    {k === resumeKey && <div className="next-tag">{p > 0 ? '继续' : '下一集'}</div>}
                    {p > 0 && <div className="progress"><i style={{ width: (p / e.duration) * 100 + '%' }} /></div>}
                    <div className="ep-cap"><b>第 {e.n} 集 · {e.title}</b><small>{Math.round(e.duration / 60)} 分钟</small></div>
                  </F>
                );
              })}
            </Row>
          </>
        )}
        <Row id="det:cast" title="演职员" className="d-sec">
          {v.cast.map((c, i) => (
            <F key={i} id={'det:cast:' + i} className="cast">
              <div className="cast-av" style={{ background: `linear-gradient(135deg, hsl(${(v.hue + i * 40) % 360} 50% 45%), hsl(${(v.hue2 + i * 30) % 360} 50% 22%))` }}>{c.name[0]}</div>
              <div className="cast-name">{c.name}</div><div className="cast-role">{c.role}</div>
            </F>
          ))}
        </Row>
        <Row id="det:sim" title="更多类似" className="d-sec">
          {similar.map((s, i) => <PosterCard key={s.id} v={s} id={'det:sim:' + i} />)}
        </Row>
        <div className="rows-end" />
      </div>
      {panel && (
        <SidePanel id="det:panel" title="音轨 / 字幕" onClose={() => setPanel(false)} sections={[
          { title: '音轨', opts: AUDIO, sel: trackPref.audio, onPick: (i) => { trackPref.audio = i; force((n) => n + 1); app.showToast('音轨：' + AUDIO[i]); } },
          { title: '字幕', opts: SUBS, sel: trackPref.sub, onPick: (i) => { trackPref.sub = i; force((n) => n + 1); app.showToast('字幕：' + SUBS[i]); } },
        ]} />
      )}
    </FGroup>
  );
}
