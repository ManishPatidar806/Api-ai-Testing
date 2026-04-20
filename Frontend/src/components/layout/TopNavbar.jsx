import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';

const mobileNav = [
  { label: 'Workspace', path: '/workspace' },
];

function TopNavbar() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full items-center justify-between gap-4 px-4 md:px-6">
        <button
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 lg:hidden"
          onClick={() => setOpen((prev) => !prev)}
        >
          Menu
        </button>
        <div>
          <h2 className="text-base font-semibold text-slate-800">Developer Console</h2>
          <p className="text-xs text-slate-500">AI-powered API testing and diagnostics</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <p className="hidden text-sm text-slate-600 md:block">{user?.name || user?.email}</p>
          <Button variant="secondary" onClick={signOut} className="px-3 py-1.5 text-xs">
            Logout
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          <nav className="grid grid-cols-2 gap-2">
            {mobileNav.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-xs font-medium ${
                    isActive
                      ? 'border border-blue-200 bg-blue-50 text-blue-800'
                      : 'bg-slate-50 text-slate-700'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export default TopNavbar;
