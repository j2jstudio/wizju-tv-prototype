import { useState } from 'react';
import { CHANNELS, MOVIES, SERIES } from '../data';
import { useApp } from '../store';
import { ChannelLogo } from '../ui/Art';
import { PosterCard } from '../ui/Cards';
import { F, FGroup, usePageFocus } from '../ui/F';

const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.split('');
const HOT = ['长安夜行', '星海迷航', 'CCTV-5', '雾港', '风味人间'];
const mem = { q: '' };

export function Search() {
  const app = useApp();
  const [q, setQRaw] = useState(mem.q);
  const setQ = (v: string) => { mem.q = v; setQRaw(v); };
  usePageFocus('page:search', () => 'search:k:A');
  const t = q.trim();
  const uq = t.toUpperCase().replace(/\s/g, '');
  const vods = uq ? [...MOVIES, ...SERIES].filter((v) => v.initials.indexOf(uq) >= 0 || v.title.indexOf(t) >= 0) : [];
  const chs = uq ? CHANNELS.filter((c) => c.name.toUpperCase().replace(/[-\s]/g, '').indexOf(uq.replace(/-/g, '')) >= 0 || String(c.num) === t) : [];
  return (
    <div className="page search">
      <div className="search-left">
        <div className="search-box">{q ? <span>{q}<i className="caret" /></span> : <span className="ph">输入片名首字母，如 CAYX</span>}</div>
        <FGroup id="search:kb" mem={false} className="kb">
          {KEYS.map((k) => <F key={k} id={'search:k:' + k} className="key" onOk={() => setQ(q + k)}>{k}</F>)}
          <F id="search:k:space" className="key key-wide" onOk={() => setQ(q + ' ')}>空格</F>
          <F id="search:k:del" className="key key-wide" onOk={() => setQ(q.slice(0, -1))}>删除</F>
          <F id="search:k:clr" className="key key-wide" onOk={() => setQ('')}>清空</F>
        </FGroup>
        <div className="search-tip">支持拼音首字母、片名、频道号。语音搜索将在后续版本支持。</div>
      </div>
      <FGroup id="search:res" className="search-right" scroll="y" data-pady="60">
        {!uq && (
          <>
            <div className="row-title">热门搜索</div>
            <div className="chips col">
              {HOT.map((h) => <F key={h} id={'search:hot:' + h} className="chip" onOk={() => setQ(h)}>{h}</F>)}
            </div>
          </>
        )}
        {uq && vods.length + chs.length === 0 && <div className="empty small">没有找到“{q}”相关内容</div>}
        {chs.length > 0 && <div className="row-title">频道 · {chs.length}</div>}
        {chs.length > 0 && (
          <div className="search-grid">
            {chs.slice(0, 10).map((c) => (
              <F key={c.id} id={'search:ch:' + c.id} className="card chmini" onOk={() => app.play({ kind: 'live', chId: c.id, list: CHANNELS.map((x) => x.id) })} onLong={() => app.toggleFav(c.id)}>
                <ChannelLogo c={c} size="sm" /><span className="ellip">{c.num} {c.name}</span>
              </F>
            ))}
          </div>
        )}
        {vods.length > 0 && <div className="row-title">影片 · {vods.length}</div>}
        <div className="search-grid">
          {vods.map((v) => <PosterCard key={v.id} v={v} id={'search:v:' + v.id} />)}
        </div>
      </FGroup>
    </div>
  );
}
