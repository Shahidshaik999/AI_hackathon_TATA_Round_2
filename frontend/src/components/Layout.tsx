import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Wrench, AlertTriangle, MessageSquare,
  FileText, Database, Activity, ChevronLeft, ChevronRight,
  Zap, Bell, TrendingUp, Package, BookOpen
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/priority', icon: TrendingUp, label: 'Priority' },
  { to: '/equipment', icon: Wrench, label: 'Equipment' },
  { to: '/diagnosis', icon: Activity, label: 'Diagnosis' },
  { to: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  { to: '/chat', icon: MessageSquare, label: 'AI Chat' },
  { to: '/logbook', icon: BookOpen, label: 'Logbook' },
  { to: '/spare-parts', icon: Package, label: 'Spare Parts' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/knowledge', icon: Database, label: 'Knowledge' },
];

interface LayoutProps {
  children: React.ReactNode;
  alertCount?: number;
}

export default function Layout({ children, alertCount = 0 }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-60'} bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 flex-shrink-0`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-bold text-white">Maintenance</div>
              <div className="text-xs text-blue-400">Wizard AI</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium relative
                ${isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
              {/* Alert badge on Alerts nav item */}
              {label === 'Alerts' && alertCount > 0 && (
                <span className={`${collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'} bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center`}>
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors text-sm"
          >
            {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-white">
              {navItems.find(n => n.to === location.pathname || (n.to !== '/' && location.pathname.startsWith(n.to)))?.label || 'Dashboard'}
            </h1>
            <p className="text-xs text-gray-500">Tata Steel - Intelligent Maintenance System</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-400 font-medium">System Operational</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-xs text-blue-400 font-medium">Session Active</span>
            </div>
            {alertCount > 0 && (
              <NavLink to="/alerts" className="relative">
                <Bell size={20} className="text-gray-400 hover:text-white" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              </NavLink>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
