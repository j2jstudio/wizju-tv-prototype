import { useState } from 'react';
import { type Vod } from '../data';
import { useApp } from '../store';
import { vodsOf, type Src } from '../sources';
import { PosterCard } from '../ui/Cards';
import { F, FGroup, usePageFocus } from '../ui/F';
import { Row } from './Home';

const mem: Record<string, { genre: string; view: 'grid' | 'rows' }> = {};
const COLS = 6; // v0.2 / v0.3 §4：海报墙每行 6 张，一屏 2 行

/** 电影 / 剧集分类：当前源的海报墙 */
export function Library({ type, src }: { type: 'movie' | 'series'; src: Src }) {
  useApp();
  const mk = src.id + ':' + type;
  const m = mem[mk] || (mem[mk] = { genre: '全部', view: 'grid' });
  const [genre, setGenre] = useState(m.genre);
  const [view, setView] = useState(m.view);
  const all = vodsOf(src, type);
  const genres = Array.from(new Set(all.map((v) => v.genre)));
  const items = genre === '全部' ? all : all.filter((v) => v.genre === genre);
  const p = type === 'movie' ? 'mv' : 'sr';
  const g = `lib:${mk}`;
  usePageFocus(g, () => view === 'grid' ? `${p}:g:0:0` : `${p}:r:0:0`);
  const chunks: Vod[][] = [];
  for (let i = 0; i < items.length; i += COLS) chunks.push(items.slice(i, i + COLS));
  return (
    <FGroup id={g} className="library">
      <div className="lib-scroll" data-scroll="y" data-ystart="" data-yoff="0">
        <div className="lib-head" data-row>
          <FGroup id={p + ':chips'} className="chips">
            {['全部', ...genres].map((x) => (
              <F key={x} id={`${p}:chip:${x}`} className={'chip' + (x === genre ? ' sel' : '')}
                onOk={() => { setGenre(x); m.genre = x; }}>{x}</F>
            ))}
            <F id={`${p}:view`} className="chip chip-view" onOk={() => { const v = view === 'grid' ? 'rows' : 'grid'; setView(v); m.view = v; }}>
              视图：{view === 'grid' ? '网格' : '横向行'}
            </F>
          </FGroup>
          <div className="lib-count">{items.length} 部 · {src.name}</div>
        </div>
        {view === 'grid' ? (
          <FGroup id={`${g}:grid:${genre}`} className="grid">
            {chunks.map((c, i) => (
              <div key={genre + i} className="grid-row" data-row>
                {c.map((v, j) => <PosterCard key={v.id} v={v} id={`${p}:g:${i}:${j}`} def={i === 0 && j === 0} />)}
              </div>
            ))}
          </FGroup>
        ) : (genre === '全部' ? genres : [genre]).map((x, i) => (
          <Row key={x} id={`${g}:r:${i}`} title={x}>
            {all.filter((v) => v.genre === x).map((v, j) => <PosterCard key={v.id} v={v} id={`${p}:r:${i}:${j}`} def={i === 0 && j === 0} />)}
          </Row>
        ))}
        <div className="rows-end" />
      </div>
    </FGroup>
  );
}

const ALBUMS = ['夜航星', '城市微光', '海风与盐', '老唱片', '山谷回声', '晨跑歌单', '午后爵士', '经典粤语', '钢琴小品', '民谣现场', '电子夏夜', '电影原声'];
/** Emby“音乐”媒体库（原型只展示专辑墙） */
export function Music({ src }: { src: Src }) {
  const app = useApp();
  usePageFocus('music:' + src.id, () => 'mu:0');
  return (
    <FGroup id={'music:' + src.id} className="music">
      <div className="lib-head"><div className="lib-count">{src.albums || ALBUMS.length} 张专辑 · {src.name}</div></div>
      <div className="music-grid">
        {ALBUMS.map((a, i) => (
          <F key={a} id={'mu:' + i} def={i === 0} className="card album" onOk={() => app.showToast(`音乐播放：${a}（原型未实现）`)}>
            <div className="album-art" style={{ background: `linear-gradient(135deg, hsl(${(i * 53) % 360} 60% 45%), hsl(${(i * 53 + 80) % 360} 55% 20%))` }}><span>♪</span></div>
            <div className="card-cap">{a}</div>
          </F>
        ))}
      </div>
    </FGroup>
  );
}
