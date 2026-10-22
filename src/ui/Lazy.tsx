import { useEffect, useRef, useState } from 'react';

// v0.3：只加载屏幕上的内容（Flutter：ListView.builder / GridView.builder 按需 build + 图片按需解码）。
// 每个可见单元第一次进入视口时才“加载”（海报图、频道 Logo / 正在播出），之后视为已缓存。
// __wzLoads 记录每次加载（类别切换 cat:*、海报 poster:*、频道行 ch:*），供行为测试检查
const w = window as unknown as { __wzLoads?: string[] };
export const loadLog: string[] = w.__wzLoads || (w.__wzLoads = []);
const loaded = new Set<string>();
export function logLoad(key: string) { loadLog.push(key); }

/** 返回放在单元内部的哨兵 ref（观察它的父元素）和是否已加载 */
export function useInView(key: string) {
  const ref = useRef<HTMLElement>(null);
  const [v, setV] = useState(() => loaded.has(key));
  useEffect(() => {
    if (v) return;
    const el = ref.current?.parentElement;
    if (!el || typeof IntersectionObserver === 'undefined') { loaded.add(key); logLoad(key); setV(true); return; }
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      io.disconnect();
      if (!loaded.has(key)) { loaded.add(key); logLoad(key); }
      setV(true);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [v, key]);
  return [ref, v] as const;
}
export function Sentinel({ r }: { r: React.RefObject<HTMLElement | null> }) {
  return <i ref={r as React.RefObject<HTMLElement>} className="lazy-sentinel" />;
}
