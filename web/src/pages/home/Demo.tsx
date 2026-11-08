// Live demo: catch a client's extra ask, price it, approve it as the client, sign.
// Everything runs in the browser with example data; nothing is sent anywhere.
import { AnimatePresence, m } from 'motion/react';
import { useCallback, useRef, useState, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLink } from '../../app/AppLink';
import { usePrefs } from '../../app/preferences';
import { useCountUp } from '../../lib/hooks';
import { duration, ease, spring } from '../../motion/tokens';
import { Badge, Button, Icon, Input, SignaturePad, type SignaturePadHandle } from '../../ui';

const BASE = [['home.phone.l1', 1800], ['home.phone.l2', 1100], ['home.phone.l3', 300]] as const;
const BASE_TOTAL = 3200;
type Step = 1 | 2 | 3 | 4 | 5;
const panel = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.enter } }, exit: { opacity: 0, transition: { duration: duration.fast } } };

export function Demo() {
  const { t } = useTranslation();
  const { money } = usePrefs();
  const usd = (n: number) => money(n, 'USD');
  const [step, setStep] = useState<Step>(1);
  const [price, setPrice] = useState(950);
  const [decision, setDecision] = useState<'accepted' | 'rejected' | null>(null);
  const [ink, setInk] = useState(false);
  const [typed, setTyped] = useState('');
  const pad = useRef<SignaturePadHandle>(null);
  const drop = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ x: number; y: number; over: boolean } | null>(null);
  const start = useRef({ x: 0, y: 0 });

  const added = step === 1 || decision === 'rejected' ? 0 : price;
  const total = useCountUp(BASE_TOTAL + added);
  const onInk = useCallback((v: boolean) => setInk(v), []);
  const steps = t('home.demo.steps', { returnObjects: true }) as string[];
  const current = Math.min(step, 4);

  // Drag the client's message onto the signed scope (pointer events; the button does the same).
  const overDrop = (e: PointerEvent) => { const r = drop.current?.getBoundingClientRect(); return !!r && e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom; };
  const onDown = (e: PointerEvent) => { if ((e.target as HTMLElement).closest('button')) return; card.current?.setPointerCapture(e.pointerId); start.current = { x: e.clientX, y: e.clientY }; setDrag({ x: 0, y: 0, over: false }); };
  const onMove = (e: PointerEvent) => { if (drag) setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y, over: overDrop(e) }); };
  const onUp = (e: PointerEvent) => { if (!drag) return; const hit = overDrop(e); setDrag(null); if (hit) setStep(2); };

  const reset = () => { setStep(1); setPrice(950); setDecision(null); setInk(false); setTyped(''); };
  const pill = step === 1 ? t('home.demo.signed1') : step === 5 ? t('home.demo.signed2') : t('home.demo.rev2');

  return (
    <div className="demo">
      <ol className="demo-steps" aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s} className={i + 1 === current && step < 5 ? 'is-on' : i + 1 < current || step === 5 ? 'is-done' : ''} aria-current={i + 1 === current && step < 5 ? 'step' : undefined}>
            <span className="demo-num">{i + 1 < current || step === 5 ? <Icon name="check" size={14} /> : i + 1}</span>{s}
          </li>
        ))}
      </ol>

      <div className="demo-grid">
        {/* The signed scope document */}
        <div className="demo-doc">
          <div className="demo-doc-head">
            <Badge tone={step === 1 || step === 5 ? 'success' : 'warning'}>{pill}</Badge>
            <strong>{t('home.demo.doc')}</strong>
          </div>
          <ul className="demo-lines">
            {BASE.map(([n, p]) => <li key={n}><span>{t(n)}</span><span className="mono">{usd(p)}</span></li>)}
            <AnimatePresence>
              {step > 1 && (
                <m.li key="added" className={'demo-added' + (decision === 'rejected' ? ' is-rejected' : decision === 'accepted' ? ' is-accepted' : '')}
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto', transition: spring }} exit={{ opacity: 0, height: 0 }}>
                  <span><Badge tone={decision === 'accepted' ? 'success' : decision === 'rejected' ? 'danger' : 'warning'}>{t('home.demo.added')}</Badge> {t('home.demo.line')}</span>
                  <span className="mono">+{usd(price)}</span>
                </m.li>
              )}
            </AnimatePresence>
          </ul>
          {step === 1 && <div ref={drop} className={'demo-drop' + (drag?.over ? ' is-over' : '')}>{t('home.demo.drop')}</div>}
          <div className="demo-total" aria-live="polite">
            <span>{step === 1 ? t('home.demo.signedTotal') : decision ? t('home.demo.newTotal') : t('home.demo.ifApproved')}</span>
            <b className={decision === 'accepted' ? 'is-up' : ''}>{usd(total)}</b>
          </div>
        </div>

        {/* The action panel for the current step */}
        <div className="demo-panel">
          <AnimatePresence mode="wait" initial={false}>
            {step === 1 && (
              <m.div key="s1" {...panel} className="demo-step">
                <p className="demo-from"><Icon name="message" size={16} />{t('home.demo.msgFrom')}</p>
                <div ref={card} className={'demo-ask' + (drag ? ' is-dragging' : '')} style={drag ? { transform: `translate(${drag.x}px, ${drag.y}px) rotate(-2deg)` } : undefined}
                  onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrag(null)}>
                  <span className="demo-grip" aria-hidden="true">⠿</span>{t('home.demo.msg')}
                </div>
                <p className="muted demo-hint">{t('home.demo.dragHint')}</p>
                <Button icon="plus" onClick={() => setStep(2)}>{t('home.demo.add')}</Button>
              </m.div>
            )}
            {step === 2 && (
              <m.div key="s2" {...panel} className="demo-step">
                <p className="demo-q">{t('home.demo.priceQ')}</p>
                <label className="demo-range">
                  <span className="row" style={{ justifyContent: 'space-between' }}><span>{t('home.demo.line')}</span><b className="mono">{usd(price)}</b></span>
                  <input type="range" min={200} max={2400} step={50} value={price} onChange={(e) => setPrice(Number(e.target.value))} aria-label={t('home.demo.price')} aria-valuetext={usd(price)} />
                </label>
                <p className="muted">{t('home.demo.hours', { hours: Math.round(price / 80) })}</p>
                <Button iconEnd="arrow" onClick={() => setStep(3)}>{t('home.demo.send')}</Button>
              </m.div>
            )}
            {step === 3 && (
              <m.div key="s3" {...panel} className="demo-step">
                <p className="demo-q">{t('home.demo.youAre')}</p>
                <div className="demo-change">
                  <span>{t('home.demo.line')}</span><b className="mono">+{usd(price)}</b>
                </div>
                <div className="row">
                  <Button variant={decision === 'accepted' ? 'primary' : 'secondary'} icon="check" aria-pressed={decision === 'accepted'} onClick={() => setDecision('accepted')}>{t('home.demo.approve')}</Button>
                  <Button variant={decision === 'rejected' ? 'danger' : 'secondary'} icon="x" aria-pressed={decision === 'rejected'} onClick={() => setDecision('rejected')}>{t('home.demo.reject')}</Button>
                </div>
                <Button iconEnd="arrow" disabled={!decision} onClick={() => setStep(4)}>{t('home.demo.toSign')}</Button>
              </m.div>
            )}
            {step === 4 && (
              <m.div key="s4" {...panel} className="demo-step">
                <p className="demo-q">{t('home.demo.signHint')}</p>
                <SignaturePad ref={pad} onInk={onInk} label={t('home.demo.signHint')} />
                <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t('home.demo.typeName')} aria-label={t('home.demo.typeName')} />
                <div className="row">
                  <Button icon="sign" disabled={!ink && typed.trim().length < 2} onClick={() => setStep(5)}>{t('home.demo.signIt')}</Button>
                  <Button variant="ghost" onClick={() => { pad.current?.clear(); setTyped(''); }}>{t('home.demo.clear')}</Button>
                </div>
              </m.div>
            )}
            {step === 5 && (
              <m.div key="s5" {...panel} className="demo-step demo-done">
                <p className="demo-q"><Icon name="check" size={20} /> {t('home.demo.done')}</p>
                <dl className="demo-receipt">
                  <dt>{t('home.demo.before')}</dt><dd className="mono">{usd(BASE_TOTAL)}</dd>
                  <dt>{decision === 'accepted' ? t('home.demo.change') : t('home.demo.rejected')}</dt><dd className="mono">{decision === 'accepted' ? '+' + usd(price) : usd(0)}</dd>
                  <dt>{t('home.demo.newTotal')}</dt><dd className="mono"><b>{usd(BASE_TOTAL + added)}</b></dd>
                </dl>
                <p className="mono muted demo-hash">receipt sha256 · 9f3c…a71e</p>
                <div className="row">
                  {decision === 'accepted' && <Button icon="pay">{t('home.demo.pay', { amount: usd(price) })}</Button>}
                  <Button variant="secondary" onClick={reset}>{t('home.demo.again')}</Button>
                </div>
                <AppLink to="/new" className="demo-real">{t('home.demo.real')} <Icon name="arrow" size={16} /></AppLink>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
