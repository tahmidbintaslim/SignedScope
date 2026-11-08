// Link that preloads its page on intent (hover, focus, touch) so navigation feels instant.
import { Link, NavLink, type LinkProps, type NavLinkProps } from 'react-router';
import { preloadPage } from './routes';

const intent = (to: LinkProps['to']) => {
  const path = typeof to === 'string' ? to : to.pathname ?? '/';
  const go = () => preloadPage(path);
  return { onMouseEnter: go, onFocus: go, onTouchStart: go };
};

export function AppLink(props: LinkProps) {
  return <Link {...intent(props.to)} {...props} />;
}
export function AppNavLink(props: NavLinkProps) {
  return <NavLink {...intent(props.to)} {...props} />;
}
