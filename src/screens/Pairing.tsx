import { useEffect, useState } from 'react';
import { engine } from '../engine/focus';
import { flags, useApp } from '../store';
import { F, FGroup, usePageFocus } from '../ui/F';
import { Icon } from '../ui/Icons';
import { Qr } from '../ui/Qr';
import { SidePanel } from '../ui/SidePanel';
import { CHANNELS, MOVIES, SERIES } from '../data';
import type { Src, SrcKind } from '../sources';

let seq = 0;
/** 配对完成后新增的源（Mock 内容） */
function newSource(kind: SrcKind, file: string): Src {
  const id = 'new-' + kind + '-' + Date.now() + '-' + ++seq;
  const name = file ? file.split(' › ').pop()! : { m3u: '新 M3U 源', xtream: '新 Xtream 源', stalker: '新 Stalker 门户', emby: '新 Emby 服务器', jellyfin: '新 Jellyfin', plex: '新 Plex', local: '本地媒体' }[kind];
  const media = kind === 'emby' || kind === 'jellyfin';
  const chIds = media ? [] : CHANNELS.slice(0, 24).map((c) => c.id);
  const mvIds = media || kind === 'xtream' ? MOVIES.slice(4, 16).map((v) => v.id) : [];
  const srIds = media || kind === 'xtream' ? SERIES.slice(2, 8).map((v) => v.id) : [];
  return { id, kind, name, addr: file ? '本地导入' : 'wizju.com/pair 同步', chIds, mvIds, srIds, libs: media ? ['movies', 'series'] : undefined,
    count: media ? `${mvIds.length} 部电影 · ${srIds.length} 部剧集` : kind === 'xtream' ? `${chIds.length} 台 · ${mvIds.length + srIds.length} 部` : `${chIds.length} 台` };
}

// v0.2 §0 / §4：Xtream / M3U URL / Stalker Portal（MAC + Portal URL）/ Emby，手机端填写后同步；本地 M3U 文件仅 Android TV
const TYPES = [
  { id: 'xtream', name: 'Xtream Codes', fields: '服务器地址 · 用户名 · 密码' },
  { id: 'm3u', name: 'M3U URL', fields: '播放列表 URL · EPG 地址（可选）' },
  { id: 'stalker', name: 'Stalker Portal', fields: 'Portal URL · MAC 地址' },
  { id: 'emby', name: 'Emby', fields: '服务器地址 · 用户名 · 密码' },
  { id: 'jellyfin', name: 'Jellyfin', fields: '服务器地址 · 用户名 · 密码' },
];
const FILES = ['U 盘 › iptv › 家庭频道.m3u', 'U 盘 › iptv › 体育.m3u8', '内部存储 › Download › channels.m3u'];

export function Pairing() {
  const app = useApp();
  const android = app.settings.platform === 'android';
  const [code] = useState(() => String(100000 + Math.floor(Math.random() * 900000)));
  const [type, setType] = useState(0);
  const [phase, setPhase] = useState<'wait' | 'got' | 'sync' | 'done'>('wait');
  const [left, setLeft] = useState(600);
  const [picker, setPicker] = useState(false);
  const [got, setGot] = useState('');
  usePageFocus('page:pairing', () => 'pair:type:0');
  useEffect(() => { const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const auto = new URLSearchParams(location.search).get('autopair') !== '0';
    let t = 0;
    if (phase === 'wait' && auto) t = window.setTimeout(() => setPhase('got'), 8000);
    else if (phase === 'got') t = window.setTimeout(() => setPhase('sync'), 1200);
    else if (phase === 'sync') t = window.setTimeout(() => setPhase('done'), 1400);
    else if (phase === 'done') t = window.setTimeout(() => {
      flags.pairFromSettings = false; engine.blur(); app.setTab('home'); app.setPaired(true);
      app.setSources((s) => [...s, newSource(got ? 'm3u' : TYPES[type].id as SrcKind, got)]);
    }, 1000);
    return () => clearTimeout(t);
  }, [phase]);
  const url = `https://wizju.com/pair?code=${code}`;
  const T = TYPES[type];
  return (
    <FGroup id="page:pairing" className="pairing" data-fscope="sub">
      <div className="pair-left">
        <div className="pair-logo"><b>w</b>wizju</div>
        <div className="pair-title">添加播放源</div>
        <div className="pair-sub">不用遥控器打字：用手机扫码，填好服务器信息后电视自动同步。</div>
        <div className="pair-label">源类型（手机端选择，这里预览需要填写的内容）</div>
        <FGroup id="pair:types" className="chips">
          {TYPES.map((t, i) => <F key={t.id} id={'pair:type:' + i} className={'chip' + (i === type ? ' sel' : '')} onFocus={() => setType(i)}>{t.name}</F>)}
        </FGroup>
        <ol className="pair-steps">
          <li><b>1</b>用手机扫描右侧二维码，或在浏览器打开 <u>wizju.com/pair</u></li>
          <li><b>2</b>输入配对码 <span className="mono">{code.slice(0, 3)} {code.slice(3)}</span></li>
          <li><b>3</b>填写 {T.name}：{T.fields}</li>
        </ol>
        <FGroup id="pair:btns" className="pair-btns">
          <F id="pair:done" className="btn btn-primary" onOk={() => setPhase('got')}><Icon name="check" size={28} />我已在手机上完成</F>
          {android && <F id="pair:file" className="btn" onOk={() => setPicker(true)}><Icon name="list" size={28} />导入本地 M3U 文件</F>}
          <F id="pair:manual" className="btn" onOk={() => app.showToast('备用方式：调用系统键盘在电视上手动输入（原型未实现）')}>手动输入（备用）</F>
        </FGroup>
        {!android && <div className="pair-note">tvOS 不支持读取本地文件，请使用 M3U URL 或扫码配对。</div>}
      </div>
      <div className="pair-right">
        <div className="qr-card">
          <Qr text={url} size={340} />
          <div className="pair-code-label">配对码</div>
          <div className="pair-code">{code.split('').map((c, i) => <span key={i}>{c}</span>)}</div>
          <div className="pair-exp">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} 后过期</div>
        </div>
        <div className={'pair-status ' + phase}>
          {phase === 'wait' && <><div className="spinner sm" />等待手机端提交…</>}
          {phase === 'got' && <><Icon name="check" size={30} />已收到配置：{got || T.name}</>}
          {phase === 'sync' && <><div className="spinner sm" />正在同步频道与媒体库…</>}
          {phase === 'done' && <><Icon name="check" size={30} />添加成功，即将进入首页</>}
        </div>
      </div>
      {picker && <SidePanel id="pair:files" title="选择 M3U 文件" hint="Android TV 文件选择器（模拟）" onClose={() => setPicker(false)}
        sections={[{ opts: FILES, sel: -1, onPick: (i) => { setGot(FILES[i].split(' › ').pop()!); app.showToast(`已读取 ${FILES[i]}：128 个频道`); setPhase('got'); } }]} />}
    </FGroup>
  );
}
