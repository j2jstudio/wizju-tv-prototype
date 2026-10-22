import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CHANNEL_BY_ID, VOD_BY_ID, nextEpKey, setEpgOffset } from './data';
import { engine } from './engine/focus';
import { MOCK_SOURCES, NAV_ORDER, TYPE_LABEL, capsOf, navTypeOf, sourcesOf, type Cat, type NavType, type Src } from './sources';

export type Platform = 'android' | 'tvos';
/** 左侧导航项（v0.3：首页 / 源类型… / 搜索 / 设置；没有源时显示“添加源”） */
export type Tab = 'home' | NavType | 'add' | 'search' | 'settings';
export const isSrcTab = (t: Tab): t is NavType => t === 'iptv' || t === 'emby' || t === 'xtream' || t === 'other' || t === 'live';
export const TAB_LABEL: Record<Tab, string> = { home: '首页', ...TYPE_LABEL, add: '添加源', search: '搜索', settings: '设置' };
export interface Settings {
  platform: Platform; preview: boolean; startup: 'home' | 'last'; epgOffset: number;
  /** 导航模式：IPTV / Xtream 分开，或合并为“IPTV”（待 Rocky 确认） */
  navMode: 'split' | 'merged';
  safeGuides: boolean; hints: boolean;
}
export type Sub = { type: 'detail'; id: string; ret: string | null } | { type: 'epg'; chIds?: string[]; ret: string | null };
export type PlayReq = { kind: 'live'; chId: string; list: string[]; src?: string } | { kind: 'vod'; key: string; fromStart?: boolean };
export type { Src };

const params = new URLSearchParams(location.search);
export const flags = { pairFromSettings: false };
const LS = 'wizju-tv-proto-v3';
type Persist = { settings: Settings; favs: string[]; favSrc: Record<string, string>; recents: string[]; progress: Record<string, number>; cw: string[]; paired: boolean; sources: Src[]; curSrc: Partial<Record<NavType, string>>; cats: Partial<Record<NavType, Cat>> };
function load(): Partial<Persist> {
  if (params.get('reset') === '1' || params.get('fresh') === '1') return {};
  try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; }
}
const saved = load();

function useAppState() {
  const [settings, setSettings] = useState<Settings>(() => {
    const d: Settings = {
      platform: 'android', preview: true, startup: 'home', epgOffset: 0, safeGuides: false, hints: true, navMode: 'split',
    };
    const s = { ...d, ...(saved.settings || {}) };
    if (params.get('platform') === 'tvos' || params.get('platform') === 'android') s.platform = params.get('platform') as Platform;
    if (params.get('hints') === '0') s.hints = false;
    if (params.get('livemerge') === '1') s.navMode = 'merged';
    if (params.get('livemerge') === '0') s.navMode = 'split';
    return s;
  });
  setEpgOffset(settings.epgOffset);
  const [paired, setPaired] = useState(params.get('paired') === '1' || (params.get('paired') !== '0' && !!saved.paired));
  const [tab, setTabRaw] = useState<Tab>('home');
  const [stack, setStack] = useState<Sub[]>([]);
  const [player, setPlayer] = useState<PlayReq | null>(null);
  const [favs, setFavs] = useState<string[]>(saved.favs || ['c5', 'c21', 'c13', 'c42', 'm2', 's0']);
  const [recents, setRecents] = useState<string[]>(saved.recents || ['c5', 'c1', 'c22', 'c50']);
  const [favSrc, setFavSrc] = useState<Record<string, string>>(saved.favSrc || { c5: 'iptv-sport', c21: 'xt-star', c13: 'iptv-home', c42: 'iptv-sport' });
  const [progress, setProgress] = useState<Record<string, number>>(saved.progress || { m1: 2950, 's0:1:5': 820, 's2:2:3': 0, m20: 2400, 's13:1:2': 600, m27: 1800 });
  const [cw, setCw] = useState<string[]>(saved.cw || ['s0:1:5', 'm1', 's2:2:3', 'm20', 's13:1:2', 'm27']);
  const [sources, setSources] = useState<Src[]>(() => {
    if (saved.sources) return saved.sources;
    // ?types=iptv,emby 只保留这些类型的源（测试“空类型隐藏”）；?nosrc=1 没有任何源
    if (params.get('nosrc') === '1') return [];
    // ?srcs=iptv-home,local-1 只保留这些 id 的源
    const ids = params.get('srcs');
    if (ids) { const keep = ids.split(','); return MOCK_SOURCES.filter((x) => keep.indexOf(x.id) >= 0); }
    const ty = params.get('types');
    if (ty) { const keep = ty.split(','); return MOCK_SOURCES.filter((x) => keep.indexOf(navTypeOf(x.kind, false)) >= 0); }
    return MOCK_SOURCES;
  });
  /** 每种源类型记住上次使用的源（v0.3 §3） */
  const [curSrc, setCurSrc] = useState<Partial<Record<NavType, string>>>(saved.curSrc || {});
  /** 每种源类型当前的内容分类 */
  const [cats, setCats] = useState<Partial<Record<NavType, Cat>>>(saved.cats || {});
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const [exitDialog, setExitDialog] = useState(false);
  const [exited, setExited] = useState(false);
  const toastTimer = useRef(0);
  const popped = useRef<string | null | undefined>(undefined);
  /** 下一次渲染后要落焦点的位置：节点 id，或 'content' = 内容区第一个元素 */
  const pendingFocus = useRef<string | null>(null);

  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify({ settings, favs, favSrc, recents, progress, cw, paired, sources, curSrc, cats })); } catch { /* 隐私模式等 */ }
  }, [settings, favs, favSrc, recents, progress, cw, paired, sources, curSrc, cats]);

  const actions = useMemo(() => ({
    showToast(text: string) {
      clearTimeout(toastTimer.current);
      setToast({ text, n: Date.now() });
      toastTimer.current = window.setTimeout(() => setToast(null), 2600);
    },
    setTab(t: Tab) { setTabRaw(t); },
    /** Navigator.push：记住进入前的焦点，pop 时还原 */
    push(s: { type: 'detail'; id: string } | { type: 'epg'; chIds?: string[] }) {
      const ret = engine.current;
      setStack((st) => [...st, { ...s, ret } as Sub]);
    },
    pop() { setStack((st) => { popped.current = st.length ? st[st.length - 1].ret : undefined; return st.slice(0, -1); }); },
    play(r: PlayReq) {
      if (r.kind === 'live') setRecents((rs) => [r.chId, ...rs.filter((x) => x !== r.chId)].slice(0, 12));
      setPlayer(r);
    },
    closePlayer() { setPlayer(null); },
    tuneRecent(chId: string) { setRecents((rs) => [chId, ...rs.filter((x) => x !== chId)].slice(0, 12)); },
    /** 退出播放时保存进度（正式版同步到 Emby） */
    saveProgress(key: string, pos: number, duration: number) {
      if (pos > duration * 0.92) {
        const nk = nextEpKey(key);
        setProgress((p) => { const n = { ...p }; delete n[key]; if (nk) n[nk] = 0; return n; });
        setCw((c) => { const r = c.filter((x) => x !== key); return nk ? [nk, ...r] : r; });
      } else if (pos > 30) {
        setProgress((p) => ({ ...p, [key]: pos }));
        setCw((c) => [key, ...c.filter((x) => x !== key && x.split(':')[0] !== key.split(':')[0])]);
      }
    },
    toggleFav(id: string, src?: string) {
      if (src) setFavSrc((m) => ({ ...m, [id]: src }));
      setFavs((f) => {
        const has = f.indexOf(id) >= 0;
        const name = id[0] === 'c' ? CHANNEL_BY_ID.get(id)?.name : VOD_BY_ID.get(id.split(':')[0])?.title;
        actions.showToast(has ? `已移出收藏：${name}` : `★ 已加入收藏：${name}`);
        return has ? f.filter((x) => x !== id) : [...f, id];
      });
    },
    /** 切换某类型的当前源：保持当前分类，新源不支持则退回第一个分类；焦点落在内容区第一个元素 */
    selectSource(t: NavType, s: Src, focusContent = true) {
      setCurSrc((m) => ({ ...m, [t]: s.id }));
      setCats((m) => { const caps = capsOf(s); const c = m[t]; return { ...m, [t]: c && caps.indexOf(c) >= 0 ? c : caps[0] }; });
      if (focusContent) pendingFocus.current = 'content';
    },
    setCat(t: NavType, c: Cat) { setCats((m) => (m[t] === c ? m : { ...m, [t]: c })); },
    focusAfter(id: string) { pendingFocus.current = id; },
    setSettings, setPaired, setExitDialog, setExited, setSources,
  }), []);
  const merged = settings.navMode === 'merged';
  /** 某类型当前源：记住的源（仍存在）→ 第一个可连接的源 → 第一个 */
  const srcFor = (t: NavType): Src | undefined => {
    const list = sourcesOf(sources, t, merged);
    return list.find((x) => x.id === curSrc[t]) || list.find((x) => !x.failing) || list[0];
  };
  const catFor = (t: NavType): Cat | undefined => {
    const s = srcFor(t); if (!s) return undefined;
    const caps = capsOf(s); const c = cats[t];
    return c && caps.indexOf(c) >= 0 ? c : caps[0];
  };
  /** 导航项：只显示已添加源的类型，最多 8 项 */
  const navTabs: Tab[] = ['home', ...NAV_ORDER[settings.navMode].filter((t) => sourcesOf(sources, t, merged).length > 0)];
  // 首次使用（一个源都没有）只显示“首页、添加源、设置”
  if (navTabs.length === 1) navTabs.push('add', 'settings'); else navTabs.push('search', 'settings');
  return { settings, paired, tab, stack, player, favs, favSrc, recents, progress, cw, sources, curSrc, cats, toast, exitDialog, exited, popped, pendingFocus, merged, srcFor, catFor, navTabs: navTabs.slice(0, 8), ...actions };
}
export type App = ReturnType<typeof useAppState>;
const Ctx = createContext<App | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const s = useAppState();
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}
export const useApp = () => useContext(Ctx)!;
export function lastChannel(recents: string[]) { return CHANNEL_BY_ID.get(recents[0]) || CHANNEL_BY_ID.get('c1')!; }
