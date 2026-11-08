// Small UI hooks: run something once an element scrolls into view, and count numbers up.
import { useEffect, useRef, useState, type RefObject } from 'react';

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** True once the element has been at least `threshold` visible (never flips back). */
export function useInView<T extends Element>(threshold = 0.25): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (!('IntersectionObserver' in window)) { setSeen(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen];
}

/** Animates from the previous value to `to` (ease-out), or jumps when motion is reduced. */
export function useCountUp(to: number, ms = 700): number {
  const [v, setV] = useState(to);
  const from = useRef(to);
  useEffect(() => {
    const start = from.current;
    if (start === to || prefersReducedMotion()) { from.current = to; setV(to); return; }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      const cur = Math.round(start + (to - start) * e);
      setV(cur);
      if (k < 1) raf = requestAnimationFrame(step); else from.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); from.current = to; };
  }, [to, ms]);
  return v;
}

/** Adds .is-in to every [data-reveal] element under the page as it scrolls into view. */
export function useReveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)')];
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: 0.12 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}
