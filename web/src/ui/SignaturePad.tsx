// Draw-to-sign pad (mouse, pen or finger). Pair it with a typed-name input for keyboard users.
import { useEffect, useImperativeHandle, useRef, type PointerEvent, type Ref } from 'react';

export interface SignaturePadHandle { clear: () => void }

export function SignaturePad({ onInk, label, ref }: { onInk: (hasInk: boolean) => void; label: string; ref?: Ref<SignaturePadHandle> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const inked = useRef(false);

  useEffect(() => {
    const c = canvas.current!;
    const fit = () => {
      const r = c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
      const g = c.getContext('2d')!;
      g.scale(dpr, dpr); g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = getComputedStyle(c).color;
      inked.current = false; onInk(false);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    return () => ro.disconnect();
  }, [onInk]);

  useImperativeHandle(ref, () => ({
    clear() { const c = canvas.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); inked.current = false; onInk(false); },
  }), [onInk]);

  const pos = (e: PointerEvent) => { const r = canvas.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };
  return (
    <canvas
      ref={canvas}
      className="ss-sigpad"
      role="img"
      aria-label={label}
      onPointerDown={(e) => { drawing.current = true; canvas.current!.setPointerCapture(e.pointerId); const g = canvas.current!.getContext('2d')!; g.beginPath(); g.moveTo(...pos(e)); }}
      onPointerMove={(e) => {
        if (!drawing.current) return;
        const g = canvas.current!.getContext('2d')!; g.lineTo(...pos(e)); g.stroke();
        if (!inked.current) { inked.current = true; onInk(true); }
      }}
      onPointerUp={() => { drawing.current = false; }}
      onPointerCancel={() => { drawing.current = false; }}
    />
  );
}
