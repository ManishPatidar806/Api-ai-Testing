import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';

const navigation = [
  { label: 'Dashboard', path: '/' },
  { label: 'API Workspace', path: '/workspace' },
];

function Sidebar() {
  return (
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">AI Suite</p>
        <h1 className="mt-1 text-lg font-bold text-slate-900">API Testing Platform</h1>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'block rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'border border-blue-200 bg-blue-50 text-blue-800'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
