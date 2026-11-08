import { useTranslation } from 'react-i18next';
import { ButtonLink, EmptyState } from '../ui';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <section className="container">
      <EmptyState art="inbox" title={<span role="heading" aria-level={1}>{t('notFound.title')}</span>} body={t('notFound.body')}
        action={<ButtonLink to="/" icon="home">{t('notFound.home')}</ButtonLink>} />
    </section>
  );
}
