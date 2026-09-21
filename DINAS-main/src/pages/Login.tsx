import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LogoTubaba } from '../components/common/LogoTubaba';
import { Modal } from '../components/common/Modal';
import { supabase } from '../lib/supabase';
import { User, Role } from '../types';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  RotateCw,
} from 'lucide-react';

interface NotificationModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

export const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Memverifikasi akun...');

  // Modal notification state for Skenario A, B, and errors
  const [modalState, setModalState] = useState<NotificationModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  // State untuk memantau email yang sedang menunggu persetujuan admin
  const [pendingEmail, setPendingEmail] = useState<string | null>(() =>
    localStorage.getItem('tubaba_pending_email')
  );
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Ref untuk mencegah duplikasi eksekusi atau race condition pada auth listener
  const authProcessingRef = useRef(false);
  const insertedEmailsRef = useRef<Set<string>>(new Set());

  const { currentUser, setSessionUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Helper untuk mengaktifkan sesi lokal dan langsung redirect ke dashboard
  const activateAndRedirect = (dbUser: any, email: string, sessionMetadata?: any) => {
    const appUser: User = {
      id: String(dbUser.id || Date.now()),
      name:
        sessionMetadata?.full_name ||
        sessionMetadata?.name ||
        dbUser.name ||
        email.split('@')[0],
      username: email.split('@')[0],
      email: email,
      role: (dbUser.role as Role) || 'user',
      opdId: dbUser.opd_name
        ? dbUser.opd_name.toLowerCase().replace(/\s+/g, '-')
        : '',
      opdName: dbUser.opd_name || '',
      nip: '',
      phone: '',
      avatarUrl: sessionMetadata?.avatar_url || '',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    localStorage.removeItem('tubaba_pending_email');
    setPendingEmail(null);
    setSessionUser(appUser);
    toast.success(`Selamat datang, ${appUser.name}! Akun Anda telah aktif.`, 'Login Berhasil');

    if (window.location.hash || window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    navigate('/dashboard', { replace: true });
  };

  // Fungsi untuk memeriksa langsung status akun ke Supabase
  const checkPendingStatus = async (email: string) => {
    if (!email) return false;
    setIsCheckingStatus(true);
    try {
      const { data: dbUser } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dbUser) {
        const cleanStatus = String(dbUser.status || '').trim().toLowerCase();
        if (cleanStatus === 'active' || cleanStatus === 'aktif' || cleanStatus === 'approved') {
          setModalState((prev) => ({ ...prev, isOpen: false }));
          activateAndRedirect(dbUser, email);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.warn('Error saat memeriksa status persetujuan:', err);
      return false;
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Polling realtime otomatis: mendeteksi perubahan status di database saat user sedang menunggu
  useEffect(() => {
    if (!pendingEmail) return;

    const interval = setInterval(async () => {
      await checkPendingStatus(pendingEmail);
    }, 2500);

    return () => clearInterval(interval);
  }, [pendingEmail]);

  // Redirect jika sudah login aktif
  useEffect(() => {
    if (currentUser && currentUser.status === 'active') {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  // Listener Supabase Auth untuk Google OAuth Approval Flow
  useEffect(() => {
    const handleAuthChange = async (event: string, session: any) => {
      // Hanya proses jika ada sesi pengguna yang valid
      if ((event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') || !session?.user) {
        return;
      }

      const userEmail = session.user.email?.toLowerCase().trim();
      if (!userEmail) return;

      // Kunci ganda: Cegah eksekusi ganda jika sedang berjalan atau email sudah pernah diproses
      if (authProcessingRef.current || insertedEmailsRef.current.has(userEmail)) {
        return;
      }

      authProcessingRef.current = true;
      setIsLoading(true);
      setLoadingText('Memeriksa status persetujuan akun...');

      try {
        // Ambil data user dari Supabase terlebih dahulu
        let { data: existingUser, error } = await supabase
          .from('users')
          .select('*')
          .ilike('email', userEmail)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Jika terjadi error pada maybeSingle, fallback ke list query
        if (error && !existingUser) {
          console.warn('Peringatan query maybeSingle:', error.message);
          const { data: rows } = await supabase
            .from('users')
            .select('*')
            .ilike('email', userEmail)
            .order('id', { ascending: false })
            .limit(1);
          if (rows && rows.length > 0) {
            existingUser = rows[0];
          }
        }

        const rawStatus = existingUser?.status || '';
        const cleanStatus = String(rawStatus).trim().toLowerCase();
        const isActive = cleanStatus === 'active' || cleanStatus === 'aktif' || cleanStatus === 'approved';
        const isPending = cleanStatus === 'pending' || cleanStatus === 'menunggu';

        // ============================================================
        // CABANG KONDISI SECARA BERURUTAN
        // ============================================================

        // Kondisi 1 (User Sudah Aktif):
        if (existingUser && isActive) {
          activateAndRedirect(existingUser, userEmail, session.user.user_metadata);
          return;
        }

        // Kondisi 2 (User Sudah Terdaftar tetapi Masih Pending):
        if (existingUser && isPending) {
          setPendingEmail(userEmail);
          localStorage.setItem('tubaba_pending_email', userEmail);

          // Jalankan await supabase.auth.signOut()
          await supabase.auth.signOut();

          if (window.location.hash || window.location.search) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }

          // Tampilkan modal pemberitahuan: "Akun Anda sedang menunggu persetujuan Administrator."
          setModalState({
            isOpen: true,
            title: 'Menunggu Persetujuan Akun',
            message: 'Akun Anda sedang menunggu persetujuan Administrator.',
            type: 'warning',
          });
          return;
        }

        // Kondisi Tambahan jika Inactive:
        if (existingUser && cleanStatus === 'inactive') {
          await supabase.auth.signOut();

          if (window.location.hash || window.location.search) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }

          setModalState({
            isOpen: true,
            title: 'Akun Dinonaktifkan',
            message: 'Akun Anda sedang dinonaktifkan oleh Administrator.',
            type: 'error',
          });
          return;
        }

        // Kondisi 3 (User Belum Pernah Terdaftar):
        if (!existingUser) {
          // Double check: pastikan sekali lagi tidak ada row yang baru saja masuk
          const { data: doubleCheck } = await supabase
            .from('users')
            .select('id')
            .ilike('email', userEmail)
            .limit(1);

          if (doubleCheck && doubleCheck.length > 0) {
            setPendingEmail(userEmail);
            localStorage.setItem('tubaba_pending_email', userEmail);
            await supabase.auth.signOut();

            if (window.location.hash || window.location.search) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }

            setModalState({
              isOpen: true,
              title: 'Menunggu Persetujuan Akun',
              message: 'Akun Anda sedang menunggu persetujuan Administrator.',
              type: 'warning',
            });
            return;
          }

          // Catat email ke Set kunci agar tidak dapat di-insert ganda
          insertedEmailsRef.current.add(userEmail);

          // Jalankan query insert tunggal
          const { error: insertError } = await supabase.from('users').insert([
            {
              email: userEmail,
              role: 'user',
              status: 'pending',
            },
          ]);

          if (insertError) {
            insertedEmailsRef.current.delete(userEmail);
            console.error('Gagal simpan ke Supabase:', insertError.message);
            alert('Gagal mengirim permintaan: ' + insertError.message);
            await supabase.auth.signOut();
            return;
          }

          setPendingEmail(userEmail);
          localStorage.setItem('tubaba_pending_email', userEmail);

          // Jalankan await supabase.auth.signOut()
          await supabase.auth.signOut();

          if (window.location.hash || window.location.search) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }

          // Tampilkan modal pemberitahuan: "Permintaan akses berhasil dikirim! Akun Anda sedang menunggu persetujuan Administrator."
          setModalState({
            isOpen: true,
            title: 'Permintaan Akses Terkirim',
            message:
              'Permintaan akses berhasil dikirim! Akun Anda sedang menunggu persetujuan Administrator.',
            type: 'info',
          });
          return;
        }
      } catch (err: any) {
        console.error('Error saat verifikasi akun Supabase:', err);
        alert('Terjadi kesalahan saat memverifikasi akun: ' + (err?.message || err));
        await supabase.auth.signOut();
      } finally {
        setIsLoading(false);
        setTimeout(() => {
          authProcessingRef.current = false;
        }, 1200);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      await handleAuthChange(event, session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Tombol "Masuk dengan Akun Google" (OAuth via Supabase)
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setLoadingText('Mengarahkan ke Google...');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error('Gagal menghubungkan ke Google OAuth:', err);
      toast.error('Tidak dapat menghubungkan ke Google OAuth. Silakan coba kembali.', 'Gagal');
    }
  };


  // Icon Helper untuk Modal
  const getModalIcon = () => {
    switch (modalState.type) {
      case 'info':
        return <CheckCircle2 className="w-12 h-12 text-blue-600 mb-3" />;
      case 'warning':
        return <Clock className="w-12 h-12 text-amber-500 mb-3" />;
      case 'error':
        return <XCircle className="w-12 h-12 text-rose-600 mb-3" />;
      case 'success':
        return <CheckCircle2 className="w-12 h-12 text-emerald-600 mb-3" />;
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Decorative background lights */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100/90 overflow-hidden relative z-10">
        {/* Top Header Banner */}
        <div className="bg-linear-to-b from-blue-50/80 to-white px-8 pt-8 pb-6 text-center border-b border-slate-100">
          <div className="flex justify-center mb-3">
            <div className="p-2.5 rounded-2xl bg-white shadow-md border border-slate-100">
              <LogoTubaba size="lg" showText={false} />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Sistem Form Survey Digital TUBABA
          </h1>
          <p className="text-xs font-semibold text-blue-800 mt-1 uppercase tracking-wider">
            Kabupaten Tulang Bawang Barat, Lampung
          </p>
          <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">
            Pengumpulan dan Pengelolaan Data Survey Organisasi Perangkat Daerah
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-4">
          <div className="text-center space-y-1 mb-2">
            <h2 className="text-sm font-bold text-slate-800">
              Akses Sistem Digital
            </h2>
            <p className="text-xs text-slate-500">
              Silakan masuk menggunakan akun Google Anda untuk melanjutkan
            </p>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleGoogleLogin}
            className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold rounded-2xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
          >
            {isLoading && loadingText.includes('Google') ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span>{loadingText}</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="text-slate-800 font-semibold">Masuk dengan Akun Google</span>
              </>
            )}
          </button>

          {/* Banner status akun yang sedang menunggu persetujuan */}
          {pendingEmail && (
            <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate" title={pendingEmail}>
                  Akun ({pendingEmail}) menunggu persetujuan
                </span>
              </div>
              <button
                type="button"
                disabled={isCheckingStatus}
                onClick={async () => {
                  const approved = await checkPendingStatus(pendingEmail);
                  if (!approved) {
                    toast.info('Status akun di database masih berstatus pending.', 'Cek Status');
                  }
                }}
                className="text-blue-700 font-bold hover:underline cursor-pointer flex items-center gap-1 shrink-0 ml-2"
              >
                {isCheckingStatus ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCw className="w-3.5 h-3.5" />
                )}
                <span>Cek</span>
              </button>
            </div>
          )}

          {/* Indikator Loading */}
          {isLoading && !loadingText.includes('Google') && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-blue-800 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>{loadingText}</span>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            Kabupaten Tulang Bawang Barat
          </p>
        </div>
      </div>

      {/* Modal Notifikasi Status Login Google (Approval Flow) */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        title={modalState.title}
        confirmText="Mengerti"
        onConfirm={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        variant={
          modalState.type === 'error'
            ? 'danger'
            : modalState.type === 'warning'
            ? 'warning'
            : 'primary'
        }
        maxWidth="sm"
      >
        <div className="flex flex-col items-center text-center p-2">
          {getModalIcon()}
          <p className="text-sm text-slate-700 leading-relaxed">{modalState.message}</p>

          {pendingEmail && (modalState.type === 'warning' || modalState.type === 'info') && (
            <div className="mt-4 p-3.5 bg-blue-50/90 rounded-2xl border border-blue-200/90 text-xs w-full text-left space-y-2.5">
              <div className="flex items-center gap-2 text-blue-900 font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                <span>Memantau database otomatis...</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Email: <strong>{pendingEmail}</strong>. Begitu admin mengubah status menjadi <em>active</em> di Supabase, Anda akan langsung diarahkan ke Dashboard.
              </p>
              <button
                type="button"
                disabled={isCheckingStatus}
                onClick={async () => {
                  const approved = await checkPendingStatus(pendingEmail);
                  if (!approved) {
                    toast.info('Status akun di database masih berstatus pending.', 'Cek Status');
                  }
                }}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {isCheckingStatus ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengecek Database...</span>
                  </>
                ) : (
                  <>
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Periksa Status & Masuk Sekarang</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
