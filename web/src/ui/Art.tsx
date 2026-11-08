// Brand illustrations and mockups, inlined so their text uses the page's web fonts
// (an <img> SVG can't load fonts). The files are our own (public/brand), never user content.
const files = import.meta.glob('../../../public/brand/{illustrations,mockups}/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const byName = Object.fromEntries(Object.entries(files).map(([path, svg]) => [path.split('/').pop()!.replace('.svg', ''), svg]));

export type ArtName = 'brief-to-scope' | 'signed' | 'change-diff' | 'paid' | 'laptop-dashboard' | 'phone-sign';

export function Art({ name, className }: { name: ArtName; className?: string }) {
  return <span className={'ss-art' + (className ? ' ' + className : '')} dangerouslySetInnerHTML={{ __html: byName[name] ?? '' }} />;
}
