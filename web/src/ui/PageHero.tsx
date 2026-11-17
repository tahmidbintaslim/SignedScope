// Dark brand band at the top of a public page: title, lede, optional badge. The content after it
// can overlap the band's lower edge with `.page-lift`, like the product stage on the homepage.
import type { ReactNode } from 'react';

export function PageHero({ title, lede, badge, id }: { title: ReactNode; lede?: ReactNode; badge?: ReactNode; id?: string }) {
  return (
    <header className="page-hero">
      <div className="container page-hero-inner">
        {badge}
        <h1 id={id}>{title}</h1>
        {lede && <p className="page-hero-lede">{lede}</p>}
      </div>
    </header>
  );
}
