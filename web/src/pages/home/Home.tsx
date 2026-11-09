// Home page: the outcome, the problem, a live demo, three steps, then pricing and answers. Copy lives in i18n under "home".
import { useTranslation } from 'react-i18next';
import { AppLink } from '../../app/AppLink';
import { useCountUp, useInView, useReveal } from '../../lib/hooks';
import { usePrefs } from '../../app/preferences';
import { ButtonLink, Icon } from '../../ui';
import { Art, type ArtName } from '../../ui/Art';
import { Demo } from './Demo';
import { Faq } from './Faq';
import { HeroPhone } from './HeroPhone';
import { Pricing } from './Pricing';
import './home.css';

const PAY = ['Stripe', 'Wise', 'PayPal', 'Payoneer', 'Omise'];
const ASKS = [['a1', 240], ['a2', 950], ['a3', 400], ['a4', 600]] as const;

function SectionHead({ id, title, sub }: { id: string; title: string; sub?: string }) {
  return (
    <header className="sec-head" data-reveal>
      <h2 id={id}>{title}</h2>
      {sub && <p className="sec-sub muted">{sub}</p>}
    </header>
  );
}

function Problem() {
  const { t } = useTranslation();
  const { money } = usePrefs();
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  const total = useCountUp(seen ? ASKS.reduce((s, [, c]) => s + c, 0) : 0, 1400);
  const pct = useCountUp(seen ? 52 : 0, 1100);
  return (
    <div className="problem" ref={ref}>
      <ul className="asks">
        {ASKS.map(([k, c], i) => (
          <li key={k} className={seen ? 'is-in' : ''} style={{ transitionDelay: `${i * 140}ms` }}>
            <Icon name="message" size={18} /><span>{t(`home.problem.${k}`)}</span>
            <span className="ask-cost"><s className="mono">+{money(c, 'USD')}</s><b>{t('home.problem.free')}</b></span>
          </li>
        ))}
        <li className="asks-total"><span>{t('home.problem.given')}</span><b className="mono">{money(total, 'USD')}</b></li>
      </ul>
      <aside className="stat" data-reveal>
        <b>{pct}%</b>
        <p>{t('home.problem.stat')}</p>
        <cite className="muted">{t('home.problem.source')}</cite>
      </aside>
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  useReveal();
  const how: [ArtName, string, string][] = [['brief-to-scope', 'home.how.s1t', 'home.how.s1b'], ['signed', 'home.how.s2t', 'home.how.s2b'], ['paid', 'home.how.s3t', 'home.how.s3b']];

  return (
    <div className="home">
      {/* Hero */}
      <section className="hero" aria-labelledby="hero-h">
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1 id="hero-h">{t('home.hero.title1')} <span className="hl">{t('home.hero.title2')}</span></h1>
            <p className="hero-sub">{t('home.hero.sub')}</p>
            <div className="row hero-ctas">
              <ButtonLink to="/new" size="lg" iconEnd="arrow">{t('home.hero.cta')}</ButtonLink>
              <ButtonLink to="#demo" size="lg" variant="secondary" icon="play">{t('home.hero.demo')}</ButtonLink>
            </div>
            <p className="hero-note muted">{t('home.hero.note')}</p>
            <AppLink to="/estimate" className="hero-brief"><Icon name="spark" size={18} />{t('home.hero.brief')}<Icon name="arrow" size={16} /></AppLink>
          </div>
          <HeroPhone />
        </div>
        <div className="container pay-row">
          <span className="muted">{t('home.payRow')}</span>
          <ul>{PAY.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      </section>

      {/* Problem */}
      <section className="sec" aria-labelledby="prob-h">
        <div className="container">
          <SectionHead id="prob-h" title={t('home.problem.title')} sub={t('home.problem.sub')} />
          <Problem />
        </div>
      </section>

      {/* Live demo */}
      <section className="sec sec--tint" id="demo" aria-labelledby="demo-h">
        <div className="container">
          <SectionHead id="demo-h" title={t('home.demo.title')} sub={t('home.demo.sub')} />
          <Demo />
        </div>
      </section>

      {/* How it works */}
      <section className="sec" id="how" aria-labelledby="how-h">
        <div className="container">
          <SectionHead id="how-h" title={t('home.how.title')} />
          <ol className="how">
            {how.map(([art, h, b], i) => (
              <li key={art} data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
                <Art name={art} className="how-art" />
                <h3><span className="how-num">{i + 1}</span>{t(h)}</h3>
                <p className="muted">{t(b)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section className="sec sec--tint" id="pricing" aria-labelledby="pricing-h">
        <div className="container">
          <SectionHead id="pricing-h" title={t('home.pricing.title')} sub={t('home.pricing.sub')} />
          <Pricing />
        </div>
      </section>

      {/* FAQ */}
      <section className="sec" id="faq" aria-labelledby="faq-h">
        <div className="container faq-grid">
          <SectionHead id="faq-h" title={t('home.faq.title')} />
          <Faq />
        </div>
      </section>

      {/* Closing call to action */}
      <section className="container cta-band" data-reveal aria-labelledby="cta-h">
        <h2 id="cta-h">{t('home.cta.title')}</h2>
        <ButtonLink to="/new" size="lg" variant="secondary" iconEnd="arrow">{t('home.hero.cta')}</ButtonLink>
        <p>{t('home.cta.note')}</p>
      </section>

    </div>
  );
}
