import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const RouterContext = createContext({ path: '/', navigate: () => {} });

function currentPath() {
  return window.location.pathname.replace(/\/+$/, '') || '/';
}

export function RouterProvider({ children }) {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onPopState = () => setPath(currentPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    const target = to.startsWith('/') ? to : `/${to}`;
    if (currentPath() === target.replace(/\/+$/, '')) return;
    if (replace) window.history.replaceState({}, '', target);
    else window.history.pushState({}, '', target);
    setPath(currentPath());
    window.scrollTo(0, 0);
  }, []);

  const value = useMemo(() => ({ path, navigate }), [path, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  return useContext(RouterContext);
}

export function Link({ to, onClick, ...rest }) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        navigate(to);
      }}
      {...rest}
    />
  );
}

export function matchRoute(path) {
  if (path === '/' || path === '/index.html') return { page: 'home' };
  const detail = path.match(/^\/w\/([^/]+)$/);
  if (detail) return { page: 'detail', slug: decodeURIComponent(detail[1]) };
  const category = path.match(/^\/c\/([^/]+)$/);
  if (category) return { page: 'home', category: decodeURIComponent(category[1]) };
  const device = path.match(/^\/d\/(desktop|tablet|mobile)$/);
  if (device) return { page: 'home', device: device[1] };
  if (path === '/devices') return { page: 'devices' };
  if (path === '/categories') return { page: 'categories' };
  if (path === '/favourites') return { page: 'favourites' };
  if (path === '/profile') return { page: 'profile' };
  if (path === '/downloads') return { page: 'downloads' };
  if (path === '/auth/callback') return { page: 'auth-callback' };
  if (path === '/contact') return { page: 'contact' };
  if (path === '/admin/login') return { page: 'admin', section: 'login' };
  if (path === '/admin') return { page: 'admin', section: 'dashboard' };
  const adminSection = path.match(/^\/admin\/(wallpapers|settings|messages|users)$/);
  if (adminSection) return { page: 'admin', section: adminSection[1] };
  if (path === '/about') return { page: 'about' };
  return { page: 'notfound' };
}
