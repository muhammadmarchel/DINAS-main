import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { INITIAL_USERS, INITIAL_OPDS, INITIAL_SUBMISSIONS } from '../../data/initialData';
import { storage } from '../../services/storage';
import { Modal } from '../../components/common/Modal';
import {
  Settings,
  Calendar,
  Bell,
  Database,
  Save,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Mail,
  ShieldCheck,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const toast = useToast();

  const [activeYear, setActiveYear] = useState('2026');
  const [activePeriod, setActivePeriod] = useState('Triwulan I & II (Semester I)');
  const [deadline, setDeadline] = useState('2026-06-30');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(false);
  const [adminContactEmail, setAdminContactEmail] = useState('diskominfo@tubaba.go.id');

  const [showResetModal, setShowResetModal] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Pengaturan sistem survey TUBABA berhasil disimpan.', 'Pengaturan Tersimpan');
  };

  const handleResetDemoData = () => {
    storage.set('tubaba_survey_users', INITIAL_USERS);
    storage.set('tubaba_survey_opds', INITIAL_OPDS);
    storage.set('tubaba_survey_submissions', INITIAL_SUBMISSIONS);
    setShowResetModal(false);
    toast.success('Seluruh data simulasi telah dikembalikan ke kondisi awal pabrik.', 'Data Direset');
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Pengaturan Sistem Form Survey
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Konfigurasi jadwal pengisian survey, batas waktu tenggat OPD, notifikasi sistem, dan pemeliharaan data.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Jadwal & Periode Survey */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Periode & Tenggat Waktu Pengisian</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Tahun Anggaran</label>
              <input
                type="text"
                value={activeYear}
                onChange={(e) => setActiveYear(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="font-bold text-slate-700">Nama Tahap / Periode Aktif</label>
              <input
                type="text"
                value={activePeriod}
                onChange={(e) => setActivePeriod(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Batas Waktu Pengisian (Deadline)</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="font-bold text-slate-700">Email Pusat Bantuan Teknis Diskominfo</label>
              <input
                type="email"
                value={adminContactEmail}
                onChange={(e) => setAdminContactEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Pemberitahuan & Notifikasi */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Bell className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Pemberitahuan Otomatis ke OPD</h3>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-800 block">Kirim Notifikasi Email saat Berkas Diverifikasi</span>
                <span className="text-slate-500 text-[11px]">
                  OPD akan menerima email konfirmasi ketika admin menyetujui atau meminta perbaikan data.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyWhatsApp}
                onChange={(e) => setNotifyWhatsApp(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-800 block">Integrasi Notifikasi WhatsApp Gateway (TUBABA Command Center)</span>
                <span className="text-slate-500 text-[11px]">
                  Mengirimkan reminder pengisian kuesioner ke nomor WhatsApp PIC OPD yang terdaftar.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Save button */}
        <div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Seluruh Pengaturan</span>
          </button>
        </div>
      </form>

      {/* Demo Maintenance / Reset Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-rose-100">
          <Database className="w-5 h-5 text-rose-600" />
          <h3 className="text-base font-bold text-slate-900">Pemeliharaan Basis Data Demo</h3>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Jika Anda telah melakukan banyak penambahan, modifikasi, atau penghapusan data dan ingin mengembalikan aplikasi ke kondisi data peraga awal (5 OPD, survey lengkap, user default):
        </p>

        <button
          type="button"
          onClick={() => setShowResetModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors"
        >
          <RotateCcw className="w-4 h-4 text-rose-600" />
          <span>Kembalikan ke Data Awal (Reset Mock Database)</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Data Demo ke Kondisi Awal?"
        description="Tindakan ini akan mengembalikan daftar pengguna, OPD, dan data survey ke dataset default demonstrasi."
        confirmText="Ya, Reset Data Sekarang"
        cancelText="Batal"
        variant="danger"
        onConfirm={handleResetDemoData}
      >
        <p className="text-xs text-slate-600 leading-relaxed">
          Seluruh data baru yang Anda tambahkan selama sesi pengujian ini akan ditimpa dengan data peraga awal resmi TUBABA.
        </p>
      </Modal>
    </div>
  );
};
