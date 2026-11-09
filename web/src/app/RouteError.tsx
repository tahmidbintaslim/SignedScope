// Shown instead of React Router's stack-trace screen when a page throws while rendering.
import { useTranslation } from 'react-i18next';
import { Button, ButtonLink, EmptyState } from '../ui';

export function RouteError() {
  const { t } = useTranslation();
  return (
    <section className="container" style={{ paddingBlock: 48 }}>
      <EmptyState art="inbox" title={<span role="heading" aria-level={1}>{t('states.crashTitle')}</span>} body={t('states.crashBody')}
        action={<div className="row"><Button onClick={() => window.location.reload()}>{t('actions.retry')}</Button><ButtonLink to="/" variant="ghost" icon="home">{t('notFound.home')}</ButtonLink></div>} />
    </section>
  );
}
