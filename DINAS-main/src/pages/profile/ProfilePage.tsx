import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { opdService } from '../../services/opdService';
import { OPD } from '../../types';
import { supabase } from '../../lib/supabase';
import {
  User,
  Building,
  Mail,
  Phone,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin, updateProfile } = useAuth();
  const toast = useToast();

  const isOnboarding =
    searchParams.get('onboarding') === 'true' ||
    (!isAdmin && (!currentUser?.opdName || !currentUser?.opdName.trim()));

  const [opds, setOpds] = useState<OPD[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Form state sesuai kebutuhan UI
  const [form, setForm] = useState({
    name: currentUser?.name || '',
    nip: currentUser?.nip || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    opd_name: currentUser?.opdName || '',
  });

  // Muat daftar OPD dan sinkronkan data profil terbaru dari Supabase
  useEffect(() => {
    const allOpds = opdService.getAll();
    setOpds(allOpds);

    const loadFreshProfile = async () => {
      const targetEmail = currentUser?.email;
      if (!targetEmail) return;

      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('*')
          .ilike('email', targetEmail)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dbUser) {
          setForm({
            name: dbUser.name || currentUser?.name || '',
            nip: dbUser.nip || currentUser?.nip || '',
            email: dbUser.email || currentUser?.email || '',
            phone: dbUser.phone || currentUser?.phone || '',
            opd_name: dbUser.opd_name || currentUser?.opdName || '',
          });
        }
      } catch (err) {
        console.warn('Gagal memuat profil Supabase:', err);
      }
    };

    loadFreshProfile();
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.warning('Nama Lengkap & Gelar wajib diisi.', 'Validasi Form');
      return;
    }

    if (!isAdmin && !form.opd_name.trim()) {
      toast.warning('Silakan pilih Instansi Terdaftar (OPD) Anda.', 'Validasi Form');
      return;
    }

    setIsSaving(true);

    try {
      const userEmail = currentUser?.email || form.email;

      // Simpan ke Supabase sesuai instruksi
      const { error } = await supabase
        .from('users')
        .update({
          name: form.name.trim(),
          nip: form.nip.trim(),
          phone: form.phone.trim(),
          opd_name: form.opd_name.trim(),
        })
        .eq('email', userEmail);

      if (error) {
        toast.error('Gagal menyimpan profil: ' + error.message, 'Database Error');
        setIsSaving(false);
        return;
      }

      // Perbarui sesi lokal aplikasi
      updateProfile({
        name: form.name.trim(),
        nip: form.nip.trim(),
        phone: form.phone.trim(),
        opdName: form.opd_name.trim(),
        opdId: form.opd_name ? form.opd_name.toLowerCase().replace(/\s+/g, '-') : '',
      });

      setIsSaving(false);
      toast.success('Biodata profil berhasil disimpan ke database!', 'Profil Tersimpan');

      // Jika berhasil, alihkan pengguna langsung ke dashboard survey
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setIsSaving(false);
      console.error('Error saat simpan profil:', err);
      toast.error('Terjadi kesalahan saat menyimpan profil.', 'Error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Onboarding Notice Banner jika profil belum lengkap */}
      {isOnboarding && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl shrink-0 mt-0.5 sm:mt-0">
              <AlertCircle className="w-6 h-6 text-amber-700 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-amber-950">
                Langkah Awal: Lengkapi Biodata & Asal Instansi Anda
              </h3>
              <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
                Sebelum dapat mengakses dan mengisi formulir survey digital TUBABA, Anda wajib melengkapi data diri dan memilih <strong>Instansi Terdaftar (OPD)</strong> di bawah ini, lalu klik tombol <strong>Simpan Perubahan</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shadow-blue-500/20">
          {(form.name || currentUser?.name || 'U').charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {form.name || currentUser?.name || 'Pengguna'}
            </h2>
            {isAdmin && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                ADMINISTRATOR
              </span>
            )}
          </div>
          {form.opd_name ? (
            <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 font-medium">
              <Building className="w-3.5 h-3.5 text-blue-600" />
              <span>{form.opd_name}</span>
            </p>
          ) : (
            <p className="text-xs text-amber-600 mt-1 font-semibold">
              * Belum memilih instansi terdaftar
            </p>
          )}
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-900">Formulir Biodata Pengguna</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Informasi ini otomatis tersinkronisasi ke database Supabase dan dicantumkan pada setiap formulir survey yang Anda kirimkan.
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          {/* 1. Nama Lengkap & Gelar (name) */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 uppercase tracking-wider">
              Nama Lengkap & Gelar <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Rian Pratama, S.T."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 2. Nomor Induk Pegawai (NIP) (nip) */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider">
                Nomor Induk Pegawai (NIP)
              </label>
              <input
                type="text"
                value={form.nip}
                onChange={(e) => setForm({ ...form, nip: e.target.value })}
                placeholder="199003152015031004"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* 3. Email Resmi (email, read-only dari sesi login) */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider">
                Email Resmi (Akun Login Terverifikasi)
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={form.email}
                  readOnly
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed font-medium"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 4. No. WhatsApp / Telepon (phone) */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider">
                No. WhatsApp / Telepon
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0812-3456-7890"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            {/* 5. Instansi Terdaftar (opd_name, dropdown pilihan dinas/OPD di Tubaba) */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider">
                Instansi Terdaftar <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.opd_name}
                  onChange={(e) => setForm({ ...form, opd_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  required={!isAdmin}
                >
                  <option value="">-- Pilih Dinas / Instansi OPD di TUBABA --</option>
                  {opds.map((o) => (
                    <option key={o.id} value={o.name}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 6. Aksi Tombol "Simpan Perubahan" */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              * Pastikan pilihan instansi sesuai dengan penugasan dinas Anda.
            </p>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <span>Menyimpan ke Database...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
