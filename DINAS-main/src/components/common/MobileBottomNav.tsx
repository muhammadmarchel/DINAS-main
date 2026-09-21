import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileSpreadsheet,
  FileText,
  UserCheck,
  BarChart3,
  Menu,
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenSidebar: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenSidebar }) => {
  const { isAdmin } = useAuth();

  const adminTabs = [
    { label: 'Beranda', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Data', path: '/data-survey', icon: FileSpreadsheet },
    { label: 'Isi Survey', path: '/form-survey', icon: FileText },
    { label: 'Rekap', path: '/laporan', icon: BarChart3 },
  ];

  const userTabs = [
    { label: 'Beranda', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Isi Survey', path: '/form-survey', icon: FileText },
    { label: 'Data Saya', path: '/data-survey', icon: FileSpreadsheet },
    { label: 'Profil', path: '/profile', icon: UserCheck },
  ];

  const tabs = isAdmin ? adminTabs : userTabs;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg shadow-slate-900/10 lg:hidden px-2 py-1.5 safe-area-pb">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path + tab.label}
              to={tab.path}
              end={tab.path === '/dashboard'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] ${
                  isActive
                    ? 'text-blue-600 font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                    )}
                  </div>
                  <span className="text-[10px] mt-1 tracking-tight truncate max-w-[62px]">
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}

        {/* Tombol Menu Tambahan (Sidebar Drawer) */}
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Buka Menu Lainnya"
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 hover:text-slate-800 font-medium transition-all min-w-[56px] cursor-pointer"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Menu</span>
        </button>
      </div>
    </nav>
  );
};
