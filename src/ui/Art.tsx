import { useEffect, useRef, type CSSProperties } from 'react';
import type { Channel, Vod } from '../data';

// 用 CSS 渐变生成海报 / 背景图（不使用任何网络图片）
export function artStyle(hue: number, hue2: number, variant: number): CSSProperties {
  const a = `hsl(${hue} 70% 55%)`, b = `hsl(${hue2} 60% 18%)`, c = `hsl(${hue} 55% 30%)`;
  const layers = [
    `radial-gradient(circle at 70% 28%, hsla(${hue2},90%,70%,.85) 0 12%, transparent 13%)`,
    `repeating-linear-gradient(135deg, hsla(0,0%,100%,.07) 0 14px, transparent 14px 40px)`,
    `repeating-radial-gradient(circle at 30% 70%, hsla(${hue2},80%,70%,.18) 0 6px, transparent 6px 34px)`,
    `linear-gradient(170deg, transparent 55%, hsla(${hue2},50%,8%,.9) 56%), linear-gradient(200deg, transparent 48%, hsla(${hue},60%,20%,.8) 49%)`,
    `conic-gradient(from 200deg at 50% 110%, hsla(${hue2},80%,60%,.35), transparent 30%, hsla(${hue},80%,70%,.3) 60%, transparent)`,
  ];
  return { backgroundImage: `${layers[variant % 5]}, radial-gradient(120% 90% at 20% 10%, ${a}, transparent 60%), linear-gradient(160deg, ${c}, ${b})` };
}
export function Poster({ v, showTitle = true }: { v: Vod; showTitle?: boolean }) {
  return (
    <div className="art poster-art" style={artStyle(v.hue, v.hue2, v.variant)}>
      {showTitle && <div className="art-title"><b>{v.title}</b><small>{v.year}</small></div>}
    </div>
  );
}
export function Backdrop({ v, className }: { v: Vod; className?: string }) {
  return <div className={'art backdrop-art ' + (className || '')} style={artStyle(v.hue, v.hue2, v.variant)} />;
}
export function ChannelLogo({ c, size = 'md' }: { c: Channel; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className={'ch-logo ch-logo-' + size} style={{ background: `linear-gradient(135deg, hsl(${c.hue} 65% 45%), hsl(${(c.hue + 50) % 360} 70% 25%))` }}>
      <span>{c.short}</span>
    </div>
  );
}

// 假视频：低分辨率 canvas 动画 + 噪点，离线可用
let noise: HTMLCanvasElement | null = null;
function getNoise() {
  if (noise) return noise;
  noise = document.createElement('canvas');
  noise.width = noise.height = 96;
  const x = noise.getContext('2d')!;
  const d = x.createImageData(96, 96);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0);
  return noise;
}
export function FakeVideo({ seed, hue, playing = true, className }: { seed: number; hue: number; playing?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const st = useRef({ t: seed * 3.7, playing });
  st.current.playing = playing;
  useEffect(() => {
    const cv = ref.current!;
    const x = cv.getContext('2d')!;
    const W = cv.width, H = cv.height;
    const pat = x.createPattern(getNoise(), 'repeat')!;
    let raf = 0, last = performance.now(), acc = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const dt = now - last; last = now; acc += dt;
      if (acc < 33) return; // ~30fps
      if (st.current.playing) st.current.t += acc / 1000;
      acc = 0;
      const t = st.current.t;
      const h1 = (hue + Math.sin(t * 0.1) * 30 + 360) % 360, h2 = (hue + 60 + Math.cos(t * 0.13) * 40) % 360;
      const g = x.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, `hsl(${h1},55%,${22 + Math.sin(t * 0.5) * 4}%)`);
      g.addColorStop(1, `hsl(${h2},60%,10%)`);
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 5; i++) {
        const px = W * (0.5 + 0.42 * Math.sin(t * (0.21 + i * 0.07) + i * 2 + seed));
        const py = H * (0.5 + 0.38 * Math.cos(t * (0.17 + i * 0.05) + i * 1.3));
        const r = H * (0.18 + 0.1 * Math.sin(t * 0.3 + i));
        const rg = x.createRadialGradient(px, py, 0, px, py, r);
        rg.addColorStop(0, `hsla(${(h1 + i * 50) % 360},85%,65%,.55)`);
        rg.addColorStop(1, 'hsla(0,0%,0%,0)');
        x.fillStyle = rg; x.fillRect(0, 0, W, H);
      }
      // 地平线
      x.fillStyle = `hsla(${h2},40%,6%,.65)`;
      x.beginPath(); x.moveTo(0, H);
      for (let i = 0; i <= 16; i++) x.lineTo((W / 16) * i, H * 0.74 + Math.sin(i * 1.7 + seed + t * 0.05) * H * 0.06);
      x.lineTo(W, H); x.fill();
      x.save(); x.globalAlpha = 0.035; x.translate((Math.random() * 96) | 0, (Math.random() * 96) | 0);
      x.fillStyle = pat; x.fillRect(-96, -96, W + 192, H + 192); x.restore();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [seed, hue]);
  return <canvas ref={ref} width={320} height={180} className={'fake-video ' + (className || '')} />;
}
