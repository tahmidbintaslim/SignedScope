// Stand-in for pages that still run on the current site until phases D and E move them.
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { ButtonLink, EmptyState } from '../ui';

export default function Placeholder() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <section className="container">
      <h1 className="visually-hidden">{pathname}</h1>
      <EmptyState art="projects" title={t('placeholder.title')} body={t('placeholder.body')}
        action={<ButtonLink to="/kit" variant="secondary" iconEnd="arrow">{t('kit.title')}</ButtonLink>} />
    </section>
  );
}
