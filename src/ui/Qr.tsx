import qrcode from 'qrcode-generator';
import { useMemo } from 'react';
export function Qr({ text, size = 360 }: { text: string; size?: number }) {
  const { d, n } = useMemo(() => {
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`;
    return { d, n };
  }, [text]);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n + 4} ${n + 4}`} shapeRendering="crispEdges" style={{ background: '#fff', borderRadius: 16 }}>
      <path d={d} fill="#111" />
    </svg>
  );
}
