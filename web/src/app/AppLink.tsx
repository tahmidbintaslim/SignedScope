// Link that preloads its page on intent (hover, focus, touch) so navigation feels instant.
// Links with a #hash (anchors, tokens) and to other origins are plain <a>: a normal page load.
import type { AnchorHTMLAttributes } from 'react';
import { Link, NavLink, type LinkProps, type NavLinkProps } from 'react-router';
import { preloadPage } from './routes';

const pathOf = (to: LinkProps['to']) => (typeof to === 'string' ? to : to.pathname ?? '/');
const intent = (path: string) => {
  const go = () => preloadPage(path);
  return { onMouseEnter: go, onFocus: go, onTouchStart: go };
};
const plain = (to: string) => !to.startsWith('/') || to.startsWith('//') || to.includes('#');

export function AppLink({ to, ...props }: LinkProps) {
  const path = pathOf(to);
  if (typeof to === 'string' && plain(to)) return <a href={to} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)} />;
  return <Link to={to} {...intent(path)} {...props} />;
}
export function AppNavLink({ to, ...props }: NavLinkProps) {
  if (typeof to === 'string' && plain(to)) {
    const { className, style, children, ...rest } = props;
    return <a href={to} className={typeof className === 'string' ? className : undefined} style={typeof style === 'object' ? style : undefined} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>{typeof children === 'function' ? null : children}</a>;
  }
  return <NavLink to={to} {...intent(pathOf(to))} {...props} />;
}
