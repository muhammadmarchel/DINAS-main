import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LogoTubaba } from '../components/common/LogoTubaba';
import { supabase } from '../lib/supabase';
import { User, Role } from '../types';
import {
  Shield,
  User as UserIcon,
  Lock,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';

export const Login: React.FC = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  const { currentUser, login, loginAsRole, setSessionUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Redirect jika sudah login aktif
  useEffect(() => {
    if (currentUser && currentUser.status === 'active') {
      if (currentUser.role !== 'admin' && (!currentUser.opdName || !currentUser.opdName.trim())) {
        navigate('/profile?onboarding=true', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [currentUser, navigate]);

  // Listener Supabase Auth untuk login via Google (langsung aktif, tanpa blokir pending)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        const email = session.user.email?.toLowerCase().trim();
        if (!email) return;

        setIsLoading(true);
        setLoadingText('Memverifikasi akun Google...');

        try {
          // Cek apakah ada data di tabel users Supabase
          let { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .ilike('email', email)
            .maybeSingle();

          const role: Role = existingUser?.role || (email.includes('admin') ? 'admin' : 'user');
          const appUser: User = {
            id: String(existingUser?.id || Date.now()),
            name:
              existingUser?.name ||
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              email.split('@')[0],
            username: email.split('@')[0],
            email: email,
            role: role,
            opdId: existingUser?.opd_name
              ? existingUser.opd_name.toLowerCase().replace(/\s+/g, '-')
              : '',
            opdName: existingUser?.opd_name || '',
            nip: existingUser?.nip || '',
            phone: existingUser?.phone || '',
            avatarUrl: session.user.user_metadata?.avatar_url || '',
            status: 'active',
            createdAt: existingUser?.created_at || new Date().toISOString(),
          };

          // Pastikan akun tercatat aktif di Supabase
          await supabase.from('users').upsert(
            {
              email: email,
              name: appUser.name,
              role: appUser.role,
              status: 'active',
              opd_name: appUser.opdName || null,
            },
            { onConflict: 'email' }
          );

          setSessionUser(appUser);
          toast.success(`Selamat datang, ${appUser.name}!`, 'Login Berhasil');

          if (appUser.role !== 'admin' && !appUser.opdName) {
            navigate('/profile?onboarding=true', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } catch (err: any) {
          console.warn('Google login sync error:', err);
          // Fallback lokal jika ada gangguan koneksi Supabase
          const fallbackUser: User = {
            id: String(Date.now()),
            name: session.user.user_metadata?.full_name || email.split('@')[0],
            username: email.split('@')[0],
            email: email,
            role: email.includes('admin') ? 'admin' : 'user',
            opdId: '',
            opdName: '',
            status: 'active',
            createdAt: new Date().toISOString(),
          };
          setSessionUser(fallbackUser);
          navigate('/dashboard', { replace: true });
        } finally {
          setIsLoading(false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, setSessionUser, toast]);

  // Login dengan Username / Email & Password
  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim()) {
      toast.warning('Silakan masukkan nama pengguna atau email', 'Perhatian');
      return;
    }

    setIsLoading(true);
    setLoadingText('Memproses login...');
    try {
      const res = await login(usernameOrEmail, password || 'password123');
      if (res.success) {
        toast.success('Selamat datang kembali!', 'Login Berhasil');
        navigate('/dashboard', { replace: true });
      } else {
        toast.error(res.message || 'Nama pengguna atau kata sandi tidak cocok', 'Login Gagal');
      }
    } catch (err: any) {
      toast.error('Terjadi kendala saat login: ' + (err?.message || err), 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  // Login Cepat sebagai Administrator
  const handleQuickAdmin = () => {
    loginAsRole('admin');
    toast.success('Berhasil masuk sebagai Administrator', 'Login Admin');
    navigate('/dashboard', { replace: true });
  };

  // Login Cepat sebagai User / Responden OPD
  const handleQuickUser = () => {
    loginAsRole('user');
    toast.success('Berhasil masuk sebagai Pengguna OPD', 'Login Pengguna');
    navigate('/dashboard', { replace: true });
  };

  // Login via Google OAuth
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setLoadingText('Mengarahkan ke Google...');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/login',
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setIsLoading(false);
      toast.error('Gagal menghubungkan ke Google: ' + err.message, 'Gagal');
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100/90 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-linear-to-b from-blue-50/80 to-white px-8 pt-8 pb-6 text-center border-b border-slate-100">
          <div className="flex justify-center mb-3">
            <div className="p-2.5 rounded-2xl bg-white shadow-md border border-slate-100">
              <LogoTubaba size="lg" showText={false} />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Sistem Form Survey Digital
          </h1>
          <p className="text-xs font-semibold text-blue-800 mt-1 uppercase tracking-wider">
            Kabupaten Tulang Bawang Barat
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Pengumpulan & Pengelolaan Data Survey Perangkat Daerah
          </p>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {/* Akses Cepat 1-Klik */}
          <div>
            <div className="flex items-center gap-2 mb-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Akses Cepat Langsung Masuk</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleQuickAdmin}
                className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-blue-900 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">Administrator</span>
                <span className="text-[10px] text-blue-700/80">Kelola Semua Data</span>
              </button>

              <button
                type="button"
                onClick={handleQuickUser}
                className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-emerald-900 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <UserIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">Pengguna OPD</span>
                <span className="text-[10px] text-emerald-700/80">Pengisi Kuesioner</span>
              </button>
            </div>
          </div>

          {/* Pemisah */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] text-slate-400 font-medium shrink-0 uppercase tracking-wider">
              atau masuk dengan akun
            </span>
          </div>

          {/* Form Login Kredensial */}
          <form onSubmit={handleCredentialLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Pengguna / Email
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="admin atau email Anda..."
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password123"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isLoading && !loadingText.includes('Google') ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{loadingText || 'Memproses...'}</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Tombol Google OAuth */}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleGoogleLogin}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
          >
            {isLoading && loadingText.includes('Google') ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>{loadingText}</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Masuk dengan Akun Google</span>
              </>
            )}
          </button>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            Pemerintah Kabupaten Tulang Bawang Barat &copy; 2026
          </p>
        </div>
      </div>
    </div>
  );
};
