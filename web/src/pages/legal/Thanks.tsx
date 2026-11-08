// Shown after the early-access checkout returns (Stripe success URL).
import { useTranslation } from 'react-i18next';
import { ButtonLink, EmptyState } from '../../ui';

export default function Thanks() {
  const { t } = useTranslation();
  return (
    <section className="container">
      <EmptyState art="inbox" title={<span role="heading" aria-level={1}>{t('thanks.title')}</span>} body={t('thanks.body')}
        action={<ButtonLink to="/new" iconEnd="arrow">{t('home.hero.cta')}</ButtonLink>} />
    </section>
  );
}
