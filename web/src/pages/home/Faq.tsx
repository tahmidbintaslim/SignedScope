// Questions use native <details> so they work without JavaScript and with any screen reader.
import { useTranslation } from 'react-i18next';
import { Icon } from '../../ui';

export function Faq() {
  const { t } = useTranslation();
  const items = t('home.faq.items', { returnObjects: true }) as { q: string; a: string }[];
  return (
    <div className="faq">
      {items.map((it) => (
        <details key={it.q}>
          <summary>{it.q}<Icon name="plus" size={20} /></summary>
          <p>{it.a}</p>
        </details>
      ))}
    </div>
  );
}
