import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Bell,
  User as UserIcon,
  LogOut,
  Menu,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  ShieldCheck,
  Building,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { currentUser, isAdmin, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.info('Anda telah keluar dari Sistem Form Survey Digital TUBABA.');
    navigate('/login');
  };

  const sampleNotifications = [
    {
      id: 1,
      title: 'Survey Masuk Baru',
      desc: 'BAPPEDA telah mengirimkan data survey perencanaan.',
      time: '10 menit yang lalu',
      type: 'info',
      icon: Clock,
    },
    {
      id: 2,
      title: 'Verifikasi Berhasil',
      desc: 'Survey Diskominfo TIK telah disetujui Administrator.',
      time: '1 jam yang lalu',
      type: 'success',
      icon: CheckCircle,
    },
    {
      id: 3,
      title: 'Revisi Catatan',
      desc: 'BKPSDM memerlukan lampiran nama nominatif pegawai.',
      time: '3 jam yang lalu',
      type: 'warning',
      icon: AlertCircle,
    },
  ];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Left side: Hamburger & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Buka Menu Navigasi"
          className="p-2 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50 focus:outline-none transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand identity on mobile or top */}
        <div className="flex items-center gap-2.5 min-w-0">
          <img src="/logo-tubaba.svg" alt="TUBABA" className="w-7 h-8 object-contain hidden sm:block shrink-0" />
          <div className="flex flex-col min-w-0">
            <h1 className="text-xs sm:text-sm md:text-base font-extrabold text-slate-800 tracking-tight leading-tight truncate max-w-[170px] xs:max-w-[220px] sm:max-w-none">
              SURVEY ARSITEKTUR PEMERINTAHAN DIGITAL (PEMDI) 2026
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Kabupaten Tulang Bawang Barat, Lampung
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Notifications & User profile */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors"
            title="Pemberitahuan"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
          </button>

          {/* Notification dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                <span className="font-semibold text-slate-800 text-sm">Pemberitahuan Sistem</span>
                <span className="text-[11px] bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full">
                  3 Baru
                </span>
              </div>
              <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                {sampleNotifications.map((n) => {
                  const Icon = n.icon;
                  return (
                    <div key={n.id} className="p-3.5 hover:bg-slate-50 flex items-start gap-3 transition-colors cursor-pointer">
                      <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-800">{n.title}</div>
                        <div className="text-xs text-slate-600 line-clamp-2 mt-0.5">{n.desc}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{n.time}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pt-2 px-4 border-t border-slate-100 text-center">
                <Link
                  to="/data-survey"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                >
                  Lihat Semua Data Survey <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">
                {currentUser?.name || 'Pengguna'}
              </div>
              {isAdmin ? (
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="text-blue-700 font-semibold flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3 text-blue-600" /> Admin
                  </span>
                </div>
              ) : currentUser?.opdName ? (
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="truncate max-w-[120px]">{currentUser.opdName}</span>
                </div>
              ) : null}
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-[260px] sm:w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <p className="text-xs text-slate-500">Masuk sebagai:</p>
                <p className="text-sm font-bold text-slate-900 truncate">{currentUser?.name}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{currentUser?.email}</p>
                {isAdmin && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                      ADMINISTRATOR
                    </span>
                  </div>
                )}
                {currentUser?.opdName && (
                  <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1 truncate">
                    <Building className="w-3 h-3 shrink-0 text-slate-400" />
                    <span className="truncate">{currentUser.opdName}</span>
                  </div>
                )}
              </div>

              <div className="p-1">
                <Link
                  to="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  Profil Akun
                </Link>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Keluar / Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
