import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import {
  User,
  Building,
  Lock,
  Phone,
  Shield,
  Save,
  AlertCircle,
} from 'lucide-react';

export const DAFTAR_INSTANSI = [
  'DISKOMINFO',
  'BKPSDM',
  'BAPPEDA',
  'BAGIAN ORGANISASI SEKRETARIAT DAERAH',
  'DINAS TEKNIS',
];

const normalizeInstansi = (val: string) => {
  if (!val) return '';
  const upper = val.toUpperCase().trim();
  if (upper.includes('KOMINFO') || upper.includes('DISKOMINFO')) return 'DISKOMINFO';
  if (upper.includes('BKPSDM') || upper.includes('BPKSDM') || upper.includes('KEPEGAWAIAN')) return 'BKPSDM';
  if (upper.includes('BAPPEDA') || upper.includes('PERENCANAAN')) return 'BAPPEDA';
  if (upper.includes('ORGANISASI')) return 'BAGIAN ORGANISASI SEKRETARIAT DAERAH';
  if (upper.includes('TEKNIS') || upper === 'DINAS' || upper.includes('DINAS')) return 'DINAS TEKNIS';
  return val;
};

export const ProfilePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin, updateProfile } = useAuth();
  const toast = useToast();

  const isOnboarding =
    searchParams.get('onboarding') === 'true' ||
    (!isAdmin && (!currentUser?.opdName || !currentUser?.opdName.trim()));

  const [isSaving, setIsSaving] = useState(false);

  // Form state bersih (tanpa email, dengan opsi kata sandi untuk login kembali)
  const [form, setForm] = useState({
    name: currentUser?.name || '',
    nip: currentUser?.nip || '',
    phone: currentUser?.phone || '',
    opd_name: normalizeInstansi(currentUser?.opdName || ''),
    password: currentUser?.password || '',
  });

  // Sinkronkan data profil terbaru dari Supabase
  useEffect(() => {
    const loadFreshProfile = async () => {
      try {
        let query = supabase.from('users').select('*');
        if (currentUser?.nip) {
          query = query.eq('nip', currentUser.nip);
        } else if (currentUser?.email) {
          query = query.ilike('email', currentUser.email);
        } else if (currentUser?.name) {
          query = query.ilike('name', currentUser.name);
        } else {
          return;
        }

        const { data: dbUser } = await query
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dbUser) {
          let extractedPassword = '';
          if (dbUser.email && dbUser.email.includes('#')) {
            extractedPassword = dbUser.email.split('#')[1]?.split('@')[0] || '';
          }

          setForm((prev) => ({
            ...prev,
            name: dbUser.name || prev.name,
            nip: dbUser.nip || prev.nip,
            phone: dbUser.phone || prev.phone,
            opd_name: normalizeInstansi(dbUser.opd_name || prev.opd_name),
            password: extractedPassword || prev.password,
          }));
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
      const cleanNip = form.nip.trim();
      const cleanName = form.name.trim();
      const cleanPassword = form.password.trim() || 'password123';

      // Cari apakah pengguna sudah ada di tabel users Supabase berdasarkan NIP atau ID
      let existingUser = null;
      if (cleanNip) {
        const { data } = await supabase
          .from('users')
          .select('id, email')
          .eq('nip', cleanNip)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();
        existingUser = data;
      }

      if (!existingUser && currentUser?.id && !isNaN(Number(currentUser.id))) {
        const { data } = await supabase
          .from('users')
          .select('id, email')
          .eq('id', Number(currentUser.id))
          .maybeSingle();
        existingUser = data;
      }

      // Format email internal untuk menyimpan password akun OPD di Supabase
      const encodedEmail = cleanNip
        ? `${cleanNip}#${cleanPassword}@tubaba.go.id`
        : (currentUser?.email || `${cleanName.toLowerCase().replace(/\s+/g, '_')}#${cleanPassword}@tubaba.go.id`);

      const userPayload = {
        name: cleanName,
        nip: cleanNip || null,
        phone: form.phone.trim() || null,
        opd_name: form.opd_name.trim(),
        email: encodedEmail,
        status: 'active',
      };

      if (existingUser?.id) {
        const { error: updateError } = await supabase
          .from('users')
          .update(userPayload)
          .eq('id', existingUser.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            {
              ...userPayload,
              role: currentUser?.role || 'user',
            },
          ]);
        if (insertError) throw insertError;
      }

      // Perbarui sesi lokal aplikasi
      updateProfile({
        name: cleanName,
        nip: cleanNip,
        phone: form.phone.trim(),
        opdName: form.opd_name.trim(),
        opdId: form.opd_name ? form.opd_name.toLowerCase().replace(/\s+/g, '-') : '',
        email: cleanNip ? `${cleanNip}@tubaba.go.id` : (currentUser?.email || ''),
        password: cleanPassword,
      });

      setIsSaving(false);
      toast.success('Biodata profil berhasil disimpan! Gunakan NIP dan kata sandi untuk login kembali nanti.', 'Profil Tersimpan');

      // Alihkan pengguna langsung ke dashboard survey
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setIsSaving(false);
      console.error('Error saat simpan profil:', err);
      toast.error('Terjadi kesalahan saat menyimpan profil: ' + (err?.message || err), 'Error');
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
                Sebelum dapat mengakses dan mengisi formulir survey digital TUBABA, Anda wajib melengkapi data diri dan memilih <strong>Instansi Terdaftar</strong> di bawah ini, lalu klik tombol <strong>Simpan Perubahan</strong>.
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
                placeholder="Masukkan nama lengkap beserta gelar..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 2. Nomor Induk Pegawai (NIP) (nip) - Kosong jika belum diisi */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider">
                Nomor Induk Pegawai (NIP)
              </label>
              <input
                type="text"
                value={form.nip}
                onChange={(e) => setForm({ ...form, nip: e.target.value })}
                placeholder="Contoh: 199001012020011001"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* 3. Kata Sandi Akun untuk Login Kembali */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider">
                Kata Sandi Akun (Untuk Login Kembali)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Buat kata sandi untuk login kembali nanti..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-400 font-normal">
                * Gunakan NIP dan kata sandi ini untuk login kembali tanpa perlu mengisi formulir profil lagi.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 4. No. WhatsApp / Telepon (phone) - Kosong jika belum diisi */}
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
                  placeholder="Contoh: 08123456789"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            {/* 5. Instansi Terdaftar (opd_name, pilihan 5 instansi) */}
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
                  <option value="">-- Pilih Instansi / OPD di TUBABA --</option>
                  {DAFTAR_INSTANSI.map((nama) => (
                    <option key={nama} value={nama}>
                      {nama}
                    </option>
                  ))}
                  {form.opd_name && !DAFTAR_INSTANSI.includes(form.opd_name) && (
                    <option value={form.opd_name}>{form.opd_name}</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* 6. Aksi Tombol "Simpan Perubahan" */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              * Pastikan pilihan instansi sesuai dengan unit penugasan Anda.
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
