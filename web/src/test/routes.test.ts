import { childRoutes, pages, PRERENDER, SHELLS } from '../app/routes';

describe('routes', () => {
  it('keep every existing public URL', () => {
    for (const url of ['/', '/estimate', '/new', '/sign', '/receipt', '/verify', '/privacy', '/thanks', '/login', '/app']) expect(url in pages || SHELLS.includes(url)).toBe(true);
    expect(childRoutes.some((r) => r.path === '*')).toBe(true);
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
