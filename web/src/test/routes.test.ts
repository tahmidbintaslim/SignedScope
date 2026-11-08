import { childRoutes, pages } from '../app/routes';

describe('routes', () => {
  it('keep every existing public URL', () => {
    for (const url of ['/', '/estimate', '/new', '/sign', '/receipt', '/verify', '/privacy', '/thanks', '/login', '/app/*']) expect(pages).toHaveProperty([url]);
    expect(childRoutes.some((r) => r.path === '*')).toBe(true);
  });
});
