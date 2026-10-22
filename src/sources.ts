// v0.3 多源导航：源类型、源、源能力（分类 Tab）。全部为离线 Mock 数据
import { CHANNELS, MOVIES, SERIES, type Channel, type Vod } from './data';

export type SrcKind = 'm3u' | 'xtream' | 'stalker' | 'emby' | 'jellyfin' | 'plex' | 'local';
/** 左侧导航上的“源类型”。分开模式 iptv = M3U + Stalker；live = 合并模式下的“IPTV”（M3U + Xtream + Stalker）；other = Jellyfin / Plex / 本地媒体 */
export type NavType = 'iptv' | 'emby' | 'xtream' | 'other' | 'live';
export type Cat = 'live' | 'epg' | 'movies' | 'series' | 'music';
export const CAT_NAMES: Record<Cat, string> = { live: '直播', epg: '节目单', movies: '电影', series: '剧集', music: '音乐' };
export const KIND_LABEL: Record<SrcKind, string> = { m3u: 'M3U', xtream: 'Xtream', stalker: 'Stalker', emby: 'Emby', jellyfin: 'Jellyfin', plex: 'Plex', local: '本地媒体' };
export const TYPE_LABEL: Record<NavType, string> = { iptv: 'IPTV', emby: 'Emby', xtream: 'Xtream', other: '其他', live: 'IPTV' };
export const TYPE_ICON: Record<NavType, string> = { iptv: 'live', emby: 'emby', xtream: 'xtream', other: 'more', live: 'live' };

export interface Src {
  id: string; kind: SrcKind; name: string; addr: string; failing?: boolean;
  chIds: string[]; mvIds: string[]; srIds: string[]; albums?: number;
  /** 服务器返回的媒体库（Emby / Jellyfin） */
  libs?: Cat[];
  /** 列表里显示的数量（Mock：服务器报告的总数，原型只渲染其中一部分） */
  count: string;
}

const chOf = (pred: (c: Channel) => boolean) => CHANNELS.filter(pred).map((c) => c.id);
const has = (...cats: string[]) => (c: Channel) => cats.some((k) => c.cats.indexOf(k) >= 0);
const ids = (arr: Vod[], from: number, to: number) => arr.slice(from, to).map((v) => v.id);

export const MOCK_SOURCES: Src[] = [
  { id: 'iptv-home', kind: 'm3u', name: '家里的M3U', addr: 'http://192.168.1.2/iptv/home.m3u', chIds: CHANNELS.map((c) => c.id), mvIds: [], srIds: [], count: '1,204 台' },
  { id: 'iptv-sport', kind: 'm3u', name: '体育专线', addr: 'https://sport.example.com/live.m3u8', chIds: chOf(has('体育')), mvIds: [], srIds: [], count: '86 台' },
  { id: 'iptv-local', kind: 'm3u', name: '本地文件.m3u', addr: 'U 盘 › iptv › 本地文件.m3u', chIds: chOf(has('央视', '卫视')), mvIds: [], srIds: [], count: '320 台' },
  { id: 'iptv-bak', kind: 'm3u', name: '备用源', addr: 'http://backup.example.net/list.m3u', failing: true, chIds: [], mvIds: [], srIds: [], count: '连接失败' },
  { id: 'emby-home', kind: 'emby', name: '家庭影院', addr: 'http://192.168.1.20:8096', chIds: [], mvIds: ids(MOVIES, 0, 18), srIds: ids(SERIES, 0, 8), albums: 24, libs: ['movies', 'series', 'music'], count: '18 部电影 · 8 部剧集' },
  { id: 'emby-nas', kind: 'emby', name: '公司NAS', addr: 'https://nas.company.local:8920', chIds: [], mvIds: ids(MOVIES, 18, 26), srIds: ids(SERIES, 8, 12), libs: ['movies', 'series'], count: '8 部电影 · 4 部剧集' },
  { id: 'xt-star', kind: 'xtream', name: '星河 IPTV', addr: 'http://star-iptv.example.com:8080', chIds: chOf(has('卫视', '体育', '电影')), mvIds: [...ids(MOVIES, 26, 30), ...ids(MOVIES, 6, 14)], srIds: [...ids(SERIES, 12, 16), ...ids(SERIES, 1, 3)], count: '512 台 · 2,300 部' },
  { id: 'xt-globe', kind: 'xtream', name: '环球TV Plus', addr: 'http://globe.example.org:25461', chIds: chOf(has('新闻', '纪录', '少儿', '4K')), mvIds: ids(MOVIES, 0, 12).reverse(), srIds: ids(SERIES, 4, 10), count: '268 台 · 860 部' },
  { id: 'jf-1', kind: 'jellyfin', name: 'Jellyfin 书房', addr: 'http://192.168.1.30:8096', chIds: [], mvIds: ids(MOVIES, 8, 20), srIds: ids(SERIES, 3, 7), libs: ['movies', 'series'], count: '12 部电影 · 4 部剧集' },
  { id: 'plex-1', kind: 'plex', name: 'Plex 媒体库', addr: 'https://plex.example.com:32400', chIds: [], mvIds: ids(MOVIES, 14, 30), srIds: ids(SERIES, 9, 14), libs: ['movies', 'series'], count: '16 部电影 · 5 部剧集' },
  { id: 'local-1', kind: 'local', name: 'U 盘 · 电影', addr: 'U 盘 › Movies', chIds: [], mvIds: ids(MOVIES, 20, 27), srIds: [], count: '7 个视频' },
  { id: 'stalker-1', kind: 'stalker', name: 'Ministra 门户', addr: 'http://portal.example.tv/c/ · MAC 00:1A:79:3F:22:10', chIds: chOf(has('少儿', '新闻', '纪录', '电影')), mvIds: [], srIds: [], count: '140 台' },
];

export function navTypeOf(kind: SrcKind, merged: boolean): NavType {
  if (kind === 'emby') return 'emby';
  if (merged && (kind === 'm3u' || kind === 'xtream' || kind === 'stalker')) return 'live';
  if (kind === 'm3u' || kind === 'stalker') return 'iptv';
  if (kind === 'xtream') return 'xtream';
  return 'other'; // jellyfin / plex / local
}
/** 源能力 → 分类 Tab（v0.3 §3） */
export function capsOf(s: Src): Cat[] {
  if (s.kind === 'xtream') return ['live', 'epg', 'movies', 'series'];
  if (s.kind === 'emby' || s.kind === 'jellyfin' || s.kind === 'plex') return s.libs || ['movies', 'series'];
  if (s.kind === 'local') return ['movies'];
  return ['live', 'epg'];
}
export const NAV_ORDER: Record<'split' | 'merged', NavType[]> = { split: ['iptv', 'emby', 'xtream', 'other'], merged: ['live', 'emby', 'other'] };
export const sourcesOf = (all: Src[], t: NavType, merged: boolean) => all.filter((s) => navTypeOf(s.kind, merged) === t);
export const shortName = (n: string) => (n.length > 10 ? n.slice(0, 10) + '…' : n);
export const srcTag = (s: Src) => `${s.kind === 'm3u' || s.kind === 'stalker' ? 'IPTV' : KIND_LABEL[s.kind]} · ${s.name}`;
/** 点播内容归属哪个源（首页“继续观看”上的来源标签） */
export function ownerOfVod(all: Src[], vodId: string) { return all.find((s) => !s.failing && (s.mvIds.indexOf(vodId) >= 0 || s.srIds.indexOf(vodId) >= 0)); }
export function ownerOfChannel(all: Src[], chId: string) { return all.find((s) => !s.failing && s.chIds.indexOf(chId) >= 0); }
export const vodsOf = (s: Src, type: 'movie' | 'series') => (type === 'movie' ? s.mvIds : s.srIds).map((id) => (type === 'movie' ? MOVIES : SERIES).find((v) => v.id === id)!).filter(Boolean);
export const channelsOfSrc = (s: Src) => s.chIds.map((id) => CHANNELS.find((c) => c.id === id)!).filter(Boolean);
