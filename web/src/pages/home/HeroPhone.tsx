// The hero's phone: a client approving lines one by one, then a priced extra and the Pay button.
// Decorative motion runs in CSS; the content is described once for screen readers.
import { useTranslation } from 'react-i18next';
import { usePrefs } from '../../app/preferences';
import { Icon } from '../../ui';

export function HeroPhone() {
  const { t } = useTranslation();
  const { money } = usePrefs();
  const usd = (n: number) => money(n, 'USD');
  const lines = [[t('home.phone.l1'), t('home.phone.l1s'), 1800], [t('home.phone.l2'), t('home.phone.l2s'), 1100], [t('home.phone.l3'), t('home.phone.l3s'), 300]] as const;
  return (
    <div className="hp" role="img" aria-label={t('home.hero.art')}>
      <div className="hp-device" aria-hidden="true">
        <div className="hp-screen">
          <div className="hp-status"><span>9:41</span><span className="hp-island" /><span className="hp-batt" /></div>
          <div className="hp-from"><img src="/brand/mark.svg" width={22} height={22} alt="" />{t('home.phone.from')}</div>
          <p className="hp-title">{t('home.phone.title')}</p>
          <p className="hp-sub">{t('home.phone.sub')}</p>
          <ul className="hp-lines">
            {lines.map(([a, b, p], i) => (
              <li key={a} style={{ animationDelay: `${0.6 + i * 0.45}s` }}>
                <span className="hp-box"><Icon name="check" size={14} /></span>
                <span className="hp-txt"><b>{a}</b><small>{b}</small></span>
                <span className="hp-amt">{usd(p)}</span>
              </li>
            ))}
          </ul>
          <p className="hp-out">{t('home.phone.out')}</p>
          <div className="hp-total"><span>{t('home.phone.total')}</span><b>{usd(3200)}</b></div>
          <div className="hp-sig"><svg viewBox="0 0 200 60"><path d="M10 44c10-24 18-26 20-12s-3 20 4 9 9-24 15-12-2 18 8 6 9-12 15-3 11 3 20-6 12-6 18 0" /></svg></div>
          <div className="hp-cta">{t('home.phone.sign')}</div>
        </div>
      </div>
      <div className="hp-chip hp-chip--ask" aria-hidden="true"><Icon name="message" size={16} />{t('home.phone.ask')}</div>
      <div className="hp-chip hp-chip--ok" aria-hidden="true"><Icon name="check" size={16} />{t('home.phone.approved')} · +{usd(950)}</div>
      <div className="hp-chip hp-chip--pay" aria-hidden="true"><Icon name="pay" size={16} />{t('home.phone.pay')}</div>
    </div>
  );
}
