import { useState } from 'react';
import { engine } from '../engine/focus';
import { flags, useApp, type Settings } from '../store';
import { KIND_LABEL, TYPE_LABEL, navTypeOf } from '../sources';
import { F, FGroup, useKeyHandler, usePageFocus } from '../ui/F';
import { SidePanel } from '../ui/SidePanel';

interface Item { id: string; label: string; value: string; desc: string; act: () => void }
type Picker = { id: string; title: string; opts: string[]; sel: number; pick: (i: number) => void };
const OFFSETS = Array.from({ length: 25 }, (_, i) => i - 12);
const fmtOff = (h: number) => (h === 0 ? '0（不偏移）' : (h > 0 ? '+' : '−') + Math.abs(h) + ' 小时');

// v0.2 §4 设置：界面风格、直播聚焦预览、启动打开、EPG 时区偏移、首页入口排序、播放源管理
export function SettingsPage() {
  const app = useApp();
  const s = app.settings;
  const set = (p: Partial<Settings>) => app.setSettings((o) => ({ ...o, ...p }));
  const [picker, setPicker] = useState<Picker | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [cur, setCur] = useState<string>('platform');
  // 播放源排序（管理源）：右键进入排序模式，上下移动
  const moveSrc = (id: string, d: number) => app.setSources((o) => {
    const l = [...o]; const i = l.findIndex((x) => x.id === id); const j = i + d;
    if (j < 0 || j >= l.length) return o;
    [l[i], l[j]] = [l[j], l[i]];
    return l;
  });
  const items: (Item | string)[] = [
    '通用',
    { id: 'platform', label: '界面风格', value: s.platform === 'android' ? 'Android TV' : 'Apple TV（tvOS）', desc: '原型用：切换 Android TV（Google TV）与 Apple TV（tvOS 18 侧边栏）视觉风格；两者都用左侧导航 + 顶部二级行。也可以直接按 P 键。',
      act: () => setPicker({ id: 'platform', title: '界面风格', opts: ['Android TV（Google TV）', 'Apple TV（tvOS）'], sel: s.platform === 'android' ? 0 : 1, pick: (i) => set({ platform: i ? 'tvos' : 'android' }) }) },
    { id: 'preview', label: '直播聚焦预览', value: s.preview ? '开启' : '关闭', desc: '直播页聚焦频道即在右侧小窗预览。低端盒子或流量受限时可关闭。', act: () => set({ preview: !s.preview }) },
    { id: 'startup', label: '启动打开', value: s.startup === 'home' ? '首页' : '上次观看的频道', desc: '打开 wizju 时进入首页，或直接播放上次观看的频道。',
      act: () => setPicker({ id: 'startup', title: '启动打开', opts: ['首页', '上次观看的频道'], sel: s.startup === 'home' ? 0 : 1, pick: (i) => set({ startup: i ? 'last' : 'home' }) }) },
    { id: 'epgoff', label: 'EPG 时区偏移', value: fmtOff(s.epgOffset), desc: '节目单时间与实际播出不一致时（常见于海外源），按小时校正，范围 ±12 小时。',
      act: () => setPicker({ id: 'epgoff', title: 'EPG 时区偏移', opts: OFFSETS.map(fmtOff), sel: s.epgOffset + 12, pick: (i) => set({ epgOffset: OFFSETS[i] }) }) },
    { id: 'navmode', label: '导航模式', value: s.navMode === 'split' ? 'IPTV/Xtream 分开' : '合并为 IPTV', desc: '待确认（v0.3 §6）：IPTV 和 Xtream 在左侧导航分开两项，或合并成“IPTV”一项、在源列表里按 M3U / Xtream / Stalker 分组。URL 参数 ?livemerge=1 也可切换。',
      act: () => setPicker({ id: 'navmode', title: '导航模式', opts: ['IPTV/Xtream 分开', '合并为 IPTV'], sel: s.navMode === 'split' ? 0 : 1, pick: (i) => set({ navMode: i ? 'merged' : 'split' }) }) },
    '播放源管理',
    ...app.sources.map((x) => ({
      id: 'src:' + x.id, label: `${TYPE_LABEL[navTypeOf(x.kind, false)]} · ${x.name}`, value: moving === x.id ? '↑↓ 移动　确认完成' : x.failing ? '⚠ 连接失败' : x.count,
      desc: `${KIND_LABEL[x.kind]} · ${x.addr}\n确认：编辑 / 刷新 / 删除；右键：排序`,
      act: () => { if (moving) { setMoving(null); return; } setPicker({ id: 'src:' + x.id, title: `${KIND_LABEL[x.kind]} · ${x.name}`, opts: ['编辑（在手机上修改）', x.failing ? '重试连接' : '刷新频道与 EPG', '重命名（原型未实现）', '删除此播放源'], sel: -1, pick: (k) => {
        if (k === 3) { app.setSources((ss) => ss.filter((y) => y.id !== x.id)); app.showToast(`已删除：${x.name}`); setTimeout(() => engine.focus('set:add'), 0); }
        else app.showToast(k === 0 ? '编辑：手机扫码后修改（原型未实现）' : k === 1 ? (x.failing ? `“${x.name}”仍然无法连接（原型模拟）` : `正在刷新 ${x.name}…`) : '重命名：原型未实现');
      } }); },
    })),
    { id: 'add', label: '＋ 新增播放源', value: '', desc: '打开扫码配对页：Xtream Codes / M3U URL / Stalker Portal / Emby，Android TV 还可导入本地 M3U 文件。', act: () => { flags.pairFromSettings = true; app.setPaired(false); } },
    '原型调试',
    { id: 'hints', label: '遥控器按键提示', value: s.hints ? '显示' : '隐藏', desc: '屏幕底部的按键说明（12 秒后自动淡出），也可按 H 键切换。', act: () => set({ hints: !s.hints }) },
    { id: 'safe', label: '安全区参考线', value: s.safeGuides ? '显示' : '隐藏', desc: '显示 5% overscan 安全区边框，便于检查布局。', act: () => set({ safeGuides: !s.safeGuides }) },
    { id: 'about', label: '版本', value: 'TV 交互原型 v0.3', desc: 'React 原型，仅用于验证交互与界面；正式版基于 Flutter，见 PORTING.md。', act: () => app.showToast('wizju TV 原型 v0.3（多源导航）') },
  ];
  const kh = useKeyHandler((k) => {
    const f = engine.current || '';
    if (moving) {
      if (k.type === 'dir' && (k.dir === 'up' || k.dir === 'down')) { moveSrc(moving, k.dir === 'up' ? -1 : 1); return true; }
      if (k.type === 'back' || k.type === 'ok' || k.type === 'dir') { setMoving(null); return true; }
    }
    if (k.type === 'dir' && k.dir === 'right' && f.startsWith('set:src:')) { setMoving(f.slice(8)); return true; }
    return false;
  });
  usePageFocus('page:settings', () => 'set:platform');
  const curItem = items.find((x) => typeof x !== 'string' && x.id === cur) as Item | undefined;
  return (
    <div className="page settings" {...kh}>
      <div className="page-head"><div className="page-title">设置</div></div>
      <div className="set-cols">
        <FGroup id="set:list" data-fentry="first" className="set-list" scroll="y" data-pady="140">
          {items.map((it) => typeof it === 'string' ? <div key={it} className="set-section">{it}</div> : (
            <F key={it.id} id={'set:' + it.id} className={'list-item set-item' + (moving && it.id === 'src:' + moving ? ' moving' : '')} onFocus={() => setCur(it.id)} onOk={it.act}>
              <span>{it.label}</span><span className="set-val">{it.value}</span>
            </F>
          ))}
        </FGroup>
        <div className="set-desc">
          {curItem && <><div className="set-desc-title">{curItem.label}</div><div className="set-desc-text">{curItem.desc}</div><div className="set-desc-hint">按确认键{curItem.id.startsWith('src:') ? '管理，右键排序' : '修改'}</div></>}
        </div>
      </div>
      {picker && <SidePanel id={'set:pick:' + picker.id} title={picker.title} onClose={() => setPicker(null)}
        sections={[{ opts: picker.opts, sel: picker.sel, onPick: (i) => { picker.pick(i); if (picker.sel >= 0) app.showToast(`${picker.title}：${picker.opts[i]}`); } }]} />}
    </div>
  );
}
