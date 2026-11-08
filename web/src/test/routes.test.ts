import { childRoutes, isLegacy, LEGACY, pages, PRERENDER } from '../app/routes';

describe('routes', () => {
  it('keep every existing public URL, in React or on the old site', () => {
    for (const url of ['/', '/estimate', '/new', '/sign', '/receipt', '/verify', '/privacy', '/thanks', '/login', '/app']) expect(url in pages || LEGACY.includes(url)).toBe(true);
    expect(childRoutes.some((r) => r.path === '*')).toBe(true);
  });
  it('sends links to old pages through a normal page load', () => {
    expect(isLegacy('/app/projects/1')).toBe(true);
    expect(isLegacy('/login?next=/app')).toBe(true);
    expect(isLegacy('/new#cr=v1.abc')).toBe(false);
    expect(isLegacy('/sign#v1.abc')).toBe(false); // the sign page is React now
    expect(isLegacy('/')).toBe(false);
    expect(isLegacy('/newsletter')).toBe(false);
  });
  it('pre-renders every React page', () => { expect(PRERENDER).toEqual(Object.keys(pages)); });
});

import { safeNext } from '../lib/session';
describe('safeNext', () => {
  const o = 'https://signedscope.app';
  it('keeps same-origin paths and drops anything else', () => {
    expect(safeNext('/app/projects/1?x=1#y', o)).toBe('/app/projects/1?x=1#y');
    expect(safeNext(null, o)).toBe('/app');
    expect(safeNext('https://evil.com/app', o)).toBe('/app');
    expect(safeNext('//evil.com', o)).toBe('/app');
    expect(safeNext('/\\evil.com', o)).toBe('/app');
  });
});
