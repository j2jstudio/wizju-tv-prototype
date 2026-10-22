import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { engine, type KeyHandler } from '../engine/focus';

interface FProps {
  id: string; className?: string; style?: CSSProperties; children?: ReactNode;
  onOk?: () => void; onLong?: () => void; onFocus?: () => void; def?: boolean;
  up?: string; down?: string; left?: string; right?: string;
}
/** FocusNode：可聚焦叶子（Flutter: Focus / FocusableActionDetector） */
export function F(p: FProps) {
  const ref = useRef({ onOk: p.onOk, onLong: p.onLong, onFocus: p.onFocus });
  ref.current = { onOk: p.onOk, onLong: p.onLong, onFocus: p.onFocus };
  useLayoutEffect(() => {
    engine.nodes.set(p.id, ref);
    return () => { if (engine.nodes.get(p.id) === ref) engine.nodes.delete(p.id); };
  }, [p.id]);
  return (
    <div
      data-fid={p.id} data-fdefault={p.def ? '' : undefined}
      data-f-up={p.up} data-f-down={p.down} data-f-left={p.left} data-f-right={p.right}
      className={'f ' + (p.className || '')} style={p.style}
      onClick={() => { engine.focus(p.id); ref.current.onOk?.(); }}
    >{p.children}</div>
  );
}

let khSeq = 0;
/** 按键处理：返回要展开到容器上的属性，按键从焦点节点向上冒泡（Flutter: Focus(onKeyEvent) / Shortcuts+Actions） */
export function useKeyHandler(fn: KeyHandler) {
  const ref = useRef(fn);
  ref.current = fn;
  const id = useRef('');
  if (!id.current) id.current = 'kh' + ++khSeq;
  useLayoutEffect(() => {
    engine.keyHandlers.set(id.current, ref);
    return () => { engine.keyHandlers.delete(id.current); };
  }, []);
  return { 'data-kh': id.current };
}

/** FocusGroup：遍历分组 + 焦点记忆（Flutter: FocusTraversalGroup + FocusScope 记住 focusedChild） */
export function FGroup({ id, className, children, mem = true, style, kh, row, scroll, ...rest }: {
  id: string; className?: string; children?: ReactNode; mem?: boolean; style?: CSSProperties; kh?: { 'data-kh': string };
  row?: boolean; scroll?: string; [k: `data-${string}`]: string | undefined;
}) {
  return (
    <div data-fgroup={id} data-fmem={mem ? undefined : '0'} data-row={row ? '' : undefined} data-scroll={scroll}
      className={className} style={style} {...kh} {...rest}>{children}</div>
  );
}

/** 模态作用域挂载时接管焦点，卸载时还原（Flutter: 新路由 / 浮层 push 时 FocusScope 自动获得焦点，pop 后还原） */
export function useScope(defaultId: string | (() => string)) {
  useLayoutEffect(() => {
    const prev = engine.current;
    engine.focus(typeof defaultId === 'function' ? defaultId() : defaultId, { instant: true });
    return () => { if (prev) engine.focus(prev, { instant: true }); };
  }, []);
}

/** 页面挂载：焦点在导航栏上时不抢；否则恢复页面分组的记忆，或落在默认节点 */
export function usePageFocus(group: string, def: () => string | undefined) {
  useLayoutEffect(() => {
    const cur = engine.currentEl();
    // 焦点在导航栏或二级行（源按钮 / 分类 Tab）上时不抢：切换分类只换内容
    if (cur && cur.closest('[data-nav], [data-sec]')) return;
    const g = engine.group(group);
    const m = engine.memory.get(group);
    if (m && engine.el(m) && engine.focus(m, { instant: true })) return;
    const d = def();
    if (d && engine.focus(d, { instant: true })) return;
    if (g) engine.focusFirst(g); else engine.focusFirst();
  }, []);
}

export function useFocusWithin(pred: (id: string | null) => boolean) {
  const [v, setV] = useState(() => pred(engine.current));
  const pr = useRef(pred); pr.current = pred;
  useEffect(() => engine.subscribe((id) => setV(pr.current(id))), []);
  return v;
}
