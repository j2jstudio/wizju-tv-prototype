/*
 * wizju TV 焦点模型（按 Flutter 可移植的方式组织，详见 PORTING.md）
 *
 *  FocusNode   —— [data-fid]     可聚焦叶子（≈ Focus widget / FocusNode）
 *  FocusGroup  —— [data-fgroup]  遍历分组 + 记住上次聚焦的子节点（≈ FocusTraversalGroup + FocusScopeNode.focusedChild）
 *  FocusScope  —— [data-fscope]  模态作用域：路由 / 浮层，方向键不会跑出去（≈ ModalRoute 自带的 FocusScope）
 *  Key handler —— [data-kh]      按键从焦点节点向上冒泡到祖先（≈ Focus.onKeyEvent / Shortcuts + Actions）
 *  方向遍历：按几何位置找最近的候选（≈ DirectionalFocusTraversalPolicyMixin）
 */
export type Dir = 'up' | 'down' | 'left' | 'right';
export interface FHandlers { onOk?: () => void; onLong?: () => void; onFocus?: () => void }
type Ref = { current: FHandlers };
export type RKey =
  | { type: 'dir'; dir: Dir; repeat: boolean }
  | { type: 'ok' } | { type: 'long' } | { type: 'back' } | { type: 'digit'; d: number } | { type: 'playpause' };
export type KeyHandler = (k: RKey) => boolean | void;

class FocusTree {
  root: HTMLElement | null = null;
  current: string | null = null;
  nodes = new Map<string, Ref>();                       // FocusNode 回调
  keyHandlers = new Map<string, { current: KeyHandler }>(); // 冒泡用的按键处理
  memory = new Map<string, string>();                   // FocusGroup id -> 上次聚焦的节点 id
  scale = 1;
  private listeners = new Set<(id: string | null) => void>();
  private dirTimer = 0;
  private mo: MutationObserver | null = null;
  private pending = false;

  attach(root: HTMLElement) {
    this.root = root;
    this.mo?.disconnect();
    this.mo = new MutationObserver(() => {
      if (this.pending) return;
      this.pending = true;
      Promise.resolve().then(() => { this.pending = false; this.repair(); });
    });
    this.mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-fid'] });
  }
  subscribe(fn: (id: string | null) => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  el(id: string | null): HTMLElement | null {
    if (!id || !this.root) return null;
    return this.root.querySelector(`[data-fid="${CSS.escape(id)}"]`);
  }
  group(id: string): HTMLElement | null { return this.root ? this.root.querySelector(`[data-fgroup="${CSS.escape(id)}"]`) : null; }
  currentEl() { return this.el(this.current); }
  /** 当前模态作用域：DOM 中最后一个 [data-fscope]（最上层的路由 / 浮层） */
  scope(): HTMLElement {
    const s = this.root!.querySelectorAll<HTMLElement>('[data-fscope]');
    return s.length ? s[s.length - 1] : this.root!;
  }
  private visible(e: HTMLElement) {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && !e.closest('[data-fhidden]');
  }
  private usable(id: string | undefined, within: HTMLElement) {
    const e = id ? this.el(id) : null;
    return e && within.contains(e) && this.visible(e) ? e : null;
  }
  /** 保证全局只有一个焦点；焦点节点被卸载时，回退到作用域记忆 / 第一个节点 */
  repair() {
    if (!this.root) return;
    const el = this.currentEl();
    this.root.querySelectorAll('[data-focused]').forEach((e) => { if (e !== el) e.removeAttribute('data-focused'); });
    if (el && this.scope().contains(el)) { if (!el.hasAttribute('data-focused')) el.setAttribute('data-focused', ''); return; }
    el?.removeAttribute('data-focused');
    this.focusFirst();
  }
  blur() { this.currentEl()?.removeAttribute('data-focused'); this.current = null; }
  /** 在容器（默认当前作用域）里恢复焦点：先用分组记忆，再用 data-fdefault，最后第一个 */
  focusFirst(container?: HTMLElement) {
    const c = container || this.scope();
    const groups = [c, ...Array.from(c.querySelectorAll<HTMLElement>('[data-fgroup]'))];
    for (const g of groups) {
      const gid = g.dataset.fgroup;
      const m = gid ? this.usable(this.memory.get(gid), c) : null;
      if (m) { this.focus(m.dataset.fid!); return true; }
    }
    const all = Array.from(c.querySelectorAll<HTMLElement>('[data-fid]')).filter((e) => this.visible(e));
    const d = all.find((e) => e.hasAttribute('data-fdefault')) || all.find((e) => !e.closest('[data-nav]')) || all[0];
    if (d) { this.focus(d.dataset.fid!); return true; }
    return false;
  }
  focus(id: string, opts: { instant?: boolean } = {}) {
    const el = this.el(id);
    if (!el) return false;
    this.root!.querySelectorAll('[data-focused]').forEach((p) => { if (p !== el) p.removeAttribute('data-focused'); });
    el.setAttribute('data-focused', '');
    this.current = id;
    // 每一层 FocusGroup 都记住这个子孙节点（Flutter: FocusScopeNode.focusedChild 沿祖先链更新）
    for (let g = el.closest<HTMLElement>('[data-fgroup]'); g; g = g.parentElement ? g.parentElement.closest<HTMLElement>('[data-fgroup]') : null) {
      if (g.dataset.fmem !== '0') this.memory.set(g.dataset.fgroup!, id);
    }
    this.scrollTo(el, !!opts.instant);
    this.nodes.get(id)?.current.onFocus?.();
    this.listeners.forEach((l) => l(id));
    return true;
  }
  activate() { this.nodes.get(this.current || '')?.current.onOk?.(); }
  long() { this.nodes.get(this.current || '')?.current.onLong?.(); }
  hasLong() { return !!this.nodes.get(this.current || '')?.current.onLong && !!this.currentEl(); }

  /** 按键冒泡：焦点节点 → 祖先；返回 true 表示已处理 */
  bubble(k: RKey) {
    let e: HTMLElement | null = this.currentEl() || this.scope();
    for (; e && e !== this.root!.parentElement; e = e.parentElement) {
      const kh = e.getAttribute('data-kh');
      if (kh) { const h = this.keyHandlers.get(kh); if (h && h.current(k)) return true; }
    }
    return false;
  }

  /** 方向遍历（几何最近）+ 进入分组时恢复记忆 */
  move(dir: Dir) {
    const cur = this.currentEl();
    const scope = this.scope();
    if (!cur || !scope.contains(cur)) { this.focusFirst(); return false; }
    if (this.root) {
      this.root.dataset.dir = dir;
      clearTimeout(this.dirTimer);
      this.dirTimer = window.setTimeout(() => { if (this.root) delete this.root.dataset.dir; }, 240);
    }
    const ov = cur.getAttribute('data-f-' + dir);
    if (ov === 'none') return false;
    if (ov && this.focus(ov)) return true;
    const r = cur.getBoundingClientRect();
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    const horiz = dir === 'left' || dir === 'right';
    const navEl = cur.closest('[data-nav]') as HTMLElement | null;
    // 在导航栏内部移动时只在导航栏里找（避免展开的侧栏下方内容抢焦点）
    let cands = (navEl || scope).querySelectorAll<HTMLElement>('[data-fid]');
    const hasNavTarget = navEl ? Array.prototype.some.call(cands, (c: HTMLElement) => {
      if (c === cur) return false;
      const q = c.getBoundingClientRect();
      return dir === 'down' ? q.top >= r.bottom - 2 : dir === 'up' ? q.bottom <= r.top + 2 : dir === 'right' ? q.left >= r.right - 2 : q.right <= r.left + 2;
    }) : false;
    if (navEl && !hasNavTarget) cands = scope.querySelectorAll<HTMLElement>('[data-fid]');
    let best: HTMLElement | null = null, bs = Infinity;
    let railBest: HTMLElement | null = null, rs = Infinity;
    const vlist: { c: HTMLElement; primary: number; orth: number }[] = [];
    for (let i = 0; i < cands.length; i++) {
      const c = cands[i];
      if (c === cur) continue;
      const q = c.getBoundingClientRect();
      if (q.width === 0 && q.height === 0) continue;
      const qx = (q.left + q.right) / 2, qy = (q.top + q.bottom) / 2;
      let primary: number, orth: number;
      if (horiz) {
        if (dir === 'right' ? qx <= cx + 1 || q.right <= r.right - 1 : qx >= cx - 1 || q.left >= r.left + 1) continue;
        primary = dir === 'right' ? Math.max(0, q.left - r.right) : Math.max(0, r.left - q.right);
        orth = cy < q.top ? q.top - cy : cy > q.bottom ? cy - q.bottom : 0;
      } else {
        if (dir === 'down' ? qy <= cy + 1 || q.bottom <= r.bottom - 1 : qy >= cy - 1 || q.top >= r.top + 1) continue;
        primary = dir === 'down' ? Math.max(0, q.top - r.bottom) : Math.max(0, r.top - q.bottom);
        orth = cx < q.left ? q.left - cx : cx > q.right ? cx - q.right : 0;
      }
      if (!horiz) { if (navEl || !c.closest('.rail')) vlist.push({ c, primary, orth }); continue; }
      const s = primary + orth * 3;
      // 左右只在同一水平带内移动；左键可以进入左侧导航栏
      if (!navEl && orth > 0 && !(q.bottom > r.top + 4 && q.top < r.bottom - 4)) {
        if (dir === 'left' && c.closest('.rail') && s < rs) { rs = s; railBest = c; }
        continue;
      }
      if (s < bs) { bs = s; best = c; }
    }
    if (!horiz && vlist.length) {
      // 上下：先找最近的一“行”，再在行内选水平距离最近的
      let minP = Infinity;
      for (const v of vlist) minP = Math.min(minP, v.primary);
      let bo = Infinity;
      for (const v of vlist) if (v.primary <= minP + 48 && v.orth < bo) { bo = v.orth; best = v.c; }
    }
    if (!best) best = railBest;
    if (!best) return false;
    // 进入新的分组：从最外层“新进入”的分组开始，用它记住的子节点（焦点记忆）
    const entered: HTMLElement[] = [];
    for (let g = best.closest<HTMLElement>('[data-fgroup]'); g && scope.contains(g); g = g.parentElement ? g.parentElement.closest<HTMLElement>('[data-fgroup]') : null) {
      if (!g.contains(cur)) entered.unshift(g);
    }
    for (const g of entered) {
      if (g.dataset.fmem === '0') continue;
      const m = this.usable(this.memory.get(g.dataset.fgroup!), g);
      if (m) { best = m; break; }
      // data-fentry="first"：首次进入（无记忆）时落到默认/第一个节点，而非几何最近（≈ FocusScope 的 autofocus）
      if (g.dataset.fentry === 'first') {
        const all = Array.from(g.querySelectorAll<HTMLElement>('[data-fid]')).filter((e) => this.visible(e));
        const d = all.find((e) => e.hasAttribute('data-fdefault')) || all[0];
        if (d) { best = d; break; }
      }
    }
    return this.focus(best.dataset.fid!);
  }

  /** 焦点移出可视区时滚动容器，焦点与容器边缘保持 ≥ 60px */
  scrollTo(el: HTMLElement, instant: boolean) {
    let p = el.parentElement;
    const s = this.scale || 1;
    while (p && p !== this.root) {
      const mode = p.dataset.scroll;
      if (mode) {
        const pr = p.getBoundingClientRect();
        const opt: ScrollToOptions = { behavior: instant || p.dataset.instant ? 'auto' : 'smooth' };
        if (mode.indexOf('x') >= 0) {
          const er = el.getBoundingClientRect();
          const left = (er.left - pr.left) / s + p.scrollLeft, right = left + er.width / s;
          const padL = Math.max(60, +(p.dataset.padl || 120)), padR = Math.max(60, +(p.dataset.padr || 120));
          let t = p.scrollLeft;
          if (left - padL < t) t = left - padL; else if (right + padR > t + p.clientWidth) t = right + padR - p.clientWidth;
          opt.left = Math.max(0, Math.min(t, p.scrollWidth - p.clientWidth));
        }
        if (mode.indexOf('y') >= 0) {
          const anchor = (p.dataset.ystart !== undefined && (el.closest('[data-row]') as HTMLElement)) || el;
          const anc = p.contains(anchor) ? anchor : el;
          const er = anc.getBoundingClientRect();
          const top = (er.top - pr.top) / s + p.scrollTop, bottom = top + er.height / s;
          let t = p.scrollTop;
          if (p.dataset.ystart !== undefined) t = top - +(p.dataset.yoff || 0);
          else {
            const pad = Math.max(60, +(p.dataset.pady || 80));
            if (top - pad < t) t = top - pad; else if (bottom + pad > t + p.clientHeight) t = bottom + pad - p.clientHeight;
          }
          opt.top = Math.max(0, Math.min(t, p.scrollHeight - p.clientHeight));
        }
        p.scrollTo(opt);
      }
      p = p.parentElement;
    }
  }
}
export const engine = new FocusTree();
