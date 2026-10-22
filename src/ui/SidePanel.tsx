import { F, useKeyHandler, useScope } from './F';
import { Icon } from './Icons';

export interface PanelSection { title?: string; opts: string[]; sel: number; onPick: (i: number) => void }
/** 右侧面板（音轨 / 字幕 / 倍速 / 设置选项）：浮层作用域，返回或左键关闭，选中后回到打开它的按钮 */
export function SidePanel({ id, title, sections, onClose, hint }: { id: string; title: string; sections: PanelSection[]; onClose: () => void; hint?: string }) {
  const first = sections.findIndex((s) => s.sel >= 0);
  const si = first < 0 ? 0 : first;
  useScope(`${id}:${si}:${Math.max(0, sections[si].sel)}`);
  const kh = useKeyHandler((k) => {
    if (k.type === 'back' || (k.type === 'dir' && k.dir === 'left')) { onClose(); return true; }
    return false;
  });
  return (
    <div className="side-panel" data-fscope="overlay" {...kh}>
      <div className="sp-title">{title}</div>
      <div className="sp-scroll" data-scroll="y" data-pady="120">
        {sections.map((s, i) => (
          <div key={i}>
            {s.title && <div className="sp-section">{s.title}</div>}
            {s.opts.map((o, j) => (
              <F key={o + j} id={`${id}:${i}:${j}`} className={'list-item sp-item' + (j === s.sel ? ' sel' : '')} onOk={() => { s.onPick(j); onClose(); }}>
                <span className="sp-check">{j === s.sel ? <Icon name="check" size={28} /> : null}</span>{o}
              </F>
            ))}
          </div>
        ))}
      </div>
      <div className="sp-hint">{hint || '确认：选择　返回 / 左键：关闭'}</div>
    </div>
  );
}
