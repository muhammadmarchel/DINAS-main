import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LogoTubaba } from './LogoTubaba';
import {
  LayoutDashboard,
  FileSpreadsheet,
  FileText,
  Users,
  BarChart3,
  Settings,
  LogOut,
  UserCheck,
  ChevronRight,
  Shield,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentUser, isAdmin, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.info('Sesi Anda telah berakhir.');
    navigate('/login');
  };

  const adminNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Data Survey', path: '/data-survey', icon: FileSpreadsheet },
    { label: 'Form Survey', path: '/form-survey', icon: FileText },
    { label: 'Manajemen User', path: '/users', icon: Users },
    { label: 'Laporan Rekapitulasi', path: '/laporan', icon: BarChart3 },
    { label: 'Pengaturan Sistem', path: '/settings', icon: Settings },
  ];

  const userNavItems = [
    { label: 'Dashboard Saya', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Isi Form Survey', path: '/form-survey', icon: FileText },
    { label: 'Data Survey Saya', path: '/data-survey', icon: FileSpreadsheet },
    { label: 'Profil Akun', path: '/profile', icon: UserCheck },
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-slate-900 text-slate-100 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top brand header */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/40">
            <LogoTubaba size="sm" textColor="light" />
            <button
              onClick={onClose}
              aria-label="Tutup Menu"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User badge pill */}
          <div className="p-3 mx-3 my-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shrink-0">
              {isAdmin ? <Shield className="w-4 h-4 text-blue-400" /> : <UserCheck className="w-4 h-4 text-emerald-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{currentUser?.name}</p>
              {isAdmin ? (
                <p className="text-[11px] text-blue-300 font-medium">ADMINISTRATOR</p>
              ) : currentUser?.opdName ? (
                <p className="text-[11px] text-slate-400 truncate">{currentUser.opdName}</p>
              ) : (
                <p className="text-[11px] text-slate-400 truncate">{currentUser?.email}</p>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1 mt-1 overflow-y-auto max-h-[calc(100vh-280px)]">
            <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              {isAdmin ? 'Menu Administrasi' : 'Menu Layanan Survey'}
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path + item.label}
                  to={item.path}
                  end={item.path === '/dashboard'}
                  onClick={() => {
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform opacity-40 group-hover:opacity-100 ${
                          isActive ? 'opacity-100 text-white translate-x-0.5' : ''
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Motto & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/30 space-y-2">
          {/* Official Motto Callout */}
          <div className="px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Ragem Sai Mangi Wawai</span>
            <span className="text-amber-400 font-bold">TUBABA</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 border border-transparent hover:border-rose-800/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>
    </>
  );
};
