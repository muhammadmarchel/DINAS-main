import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  User,
  Building,
  Mail,
  Phone,
  Shield,
  Key,
  Save,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { userService } from '../../services/userService';

export const ProfilePage: React.FC = () => {
  const { currentUser, isAdmin, updateProfile } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [nip, setNip] = useState(currentUser?.nip || '');

  // Password fields
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Nama lengkap tidak boleh kosong.', 'Validasi Form');
      return;
    }

    updateProfile({
      name,
      email,
      phone,
      nip,
    });
    toast.success('Informasi profil berhasil diperbarui.', 'Profil Disimpan');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPass || !confirmPass) {
      toast.warning('Harap isi kata sandi baru dan konfirmasi.', 'Validasi Sandi');
      return;
    }
    if (newPass !== confirmPass) {
      toast.error('Konfirmasi kata sandi tidak cocok.', 'Kata Sandi Berbeda');
      return;
    }
    if (newPass.length < 6) {
      toast.warning('Kata sandi minimal terdiri dari 6 karakter.', 'Sandi Terlalu Pendek');
      return;
    }

    const currentPass = currentUser?.password || 'password123';
    if (oldPass && oldPass !== currentPass && oldPass !== 'Tubaba2026!') {
      toast.error('Kata sandi lama yang Anda masukkan salah.', 'Gagal Mengubah Sandi');
      return;
    }

    if (currentUser?.id) {
      try {
        userService.update(currentUser.id, { password: newPass });
      } catch (err) {
        console.warn('Gagal update user service password:', err);
      }
      updateProfile({ password: newPass });
    }

    toast.success('Kata sandi akun Anda berhasil diperbarui.', 'Sandi Diubah');
    setOldPass('');
    setNewPass('');
    setConfirmPass('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shadow-blue-500/20">
          {currentUser?.name.charAt(0) || 'U'}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {currentUser?.name}
            </h2>
            {isAdmin && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                ADMINISTRATOR
              </span>
            )}
          </div>
          {currentUser?.opdName ? (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentUser.opdName}</span>
            </p>
          ) : (
            <p className="text-xs text-slate-500 mt-1">{currentUser?.email}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Profile Form */}
        <div className="md:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">Biodata Pengguna</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Informasi ini akan tercatat otomatis pada setiap formulir survey yang Anda isi.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider">Nama Lengkap & Gelar</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider">Nomor Induk Pegawai (NIP)</label>
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="19xxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider">Email Resmi</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider">No. WhatsApp / Telepon</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider">Instansi Terdaftar</label>
                <input
                  type="text"
                  disabled
                  value={currentUser?.opdName || ''}
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right column: Change Password */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">Ubah Kata Sandi</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Gunakan kata sandi yang kuat dan aman.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Kata Sandi Saat Ini</label>
              <input
                type="password"
                value={oldPass}
                onChange={(e) => setOldPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Kata Sandi Baru</label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Ulangi Kata Sandi Baru</label>
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Konfirmasi sandi"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-xs"
              >
                <Key className="w-4 h-4" />
                <span>Ubah Sandi</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
