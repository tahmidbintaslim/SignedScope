import { childRoutes, isLegacy, LEGACY, pages, PRERENDER } from '../app/routes';

describe('routes', () => {
  it('keep every existing public URL, in React or on the old site', () => {
    for (const url of ['/', '/estimate', '/new', '/sign', '/receipt', '/verify', '/privacy', '/thanks', '/login', '/app']) expect(url in pages || LEGACY.includes(url)).toBe(true);
    expect(childRoutes.some((r) => r.path === '*')).toBe(true);
  });
  it('sends links to old pages through a normal page load', () => {
    expect(isLegacy('/new')).toBe(true);
    expect(isLegacy('/app/projects/1')).toBe(true);
    expect(isLegacy('/sign#v1.abc')).toBe(true);
    expect(isLegacy('/')).toBe(false);
    expect(isLegacy('/newsletter')).toBe(false);
  });
  it('pre-renders every React page', () => { expect(PRERENDER).toEqual(Object.keys(pages)); });
});
