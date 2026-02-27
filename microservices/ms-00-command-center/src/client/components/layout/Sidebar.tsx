import { NavLink } from 'react-router-dom';
import { StatusBar } from './StatusBar';

const navItems = [
  { label: 'Dashboard', path: '/', icon: 'grid' },
  { label: 'Nueva HU', path: '/new-hu', icon: 'upload' },
  { label: 'Proyecto Existente', path: '/existing', icon: 'folder' },
  { label: 'Exploratory AI', path: '/exploratory', icon: 'brain' },
  { label: 'Pipeline Live', path: '/pipeline', icon: 'activity' },
  { label: 'Resultados', path: '/results', icon: 'chart' },
];

// SVG icon lookup
function NavIcon({ icon }: { icon: string }) {
  const icons: Record<string, JSX.Element> = {
    grid: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
    upload: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
    folder: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
    brain: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
    activity: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    chart: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  };
  return icons[icon] || null;
}

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface-sidebar border-r border-surface-border flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            Q
          </div>
          <div>
            <div className="text-sm font-semibold text-white">QASL NEXUS</div>
            <div className="text-xs text-gray-500">COMMAND CENTER</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <div className="text-xs text-gray-600 uppercase tracking-wider mb-3 px-3">Principal</div>
        <NavItem item={navItems[0]} />

        <div className="text-xs text-gray-600 uppercase tracking-wider mt-6 mb-3 px-3">Iniciar Pruebas</div>
        {navItems.slice(1, 4).map((item) => (
          <NavItem key={item.path} item={item} />
        ))}

        <div className="text-xs text-gray-600 uppercase tracking-wider mt-6 mb-3 px-3">Monitor</div>
        {navItems.slice(4).map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </nav>

      {/* Microservice Status */}
      <StatusBar />
    </aside>
  );
}

function NavItem({ item }: { item: typeof navItems[0] }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
          isActive
            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
            : 'text-gray-400 hover:text-gray-200 hover:bg-surface-hover'
        }`
      }
    >
      <NavIcon icon={item.icon} />
      {item.label}
    </NavLink>
  );
}
