import React, { useState, useEffect } from 'react';
import { opdService } from '../../services/opdService';
import { useToast } from '../../context/ToastContext';
import { OPD } from '../../types';
import { Modal } from '../../components/common/Modal';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  FileSpreadsheet,
  Phone,
  Mail,
  Search,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export const OpdManagement: React.FC = () => {
  const [opds, setOpds] = useState<OPD[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOpd, setEditingOpd] = useState<OPD | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OPD | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [picName, setPicName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const toast = useToast();

  const loadData = () => {
    const list = opdService.getAll();
    setOpds(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingOpd(null);
    setName('');
    setCode('1.09.01');
    setPicName('');
    setEmail('');
    setPhone('(0726) 7575');
    setAddress('Kabupaten Tulang Bawang Barat');
    setStatus('active');
    setIsFormOpen(true);
  };

  const openEditModal = (opd: OPD) => {
    setEditingOpd(opd);
    setName(opd.name);
    setCode(opd.code);
    setPicName(opd.picName);
    setEmail(opd.email);
    setPhone(opd.phone);
    setAddress(opd.address || '');
    setStatus(opd.status);
    setIsFormOpen(true);
  };

  const handleSaveOpd = () => {
    if (!name.trim() || !code.trim() || !picName.trim()) {
      toast.warning('Harap isi Nama OPD, Kode OPD, dan Nama Penanggung Jawab.', 'Validasi Form');
      return;
    }

    if (editingOpd) {
      opdService.update(editingOpd.id, {
        name,
        code,
        picName,
        email,
        phone,
        address,
        status,
      });
      toast.success(`Data ${name} berhasil diperbarui.`, 'OPD Diperbarui');
    } else {
      opdService.create({
        name,
        code,
        picName,
        email,
        phone,
        address,
        status,
      });
      toast.success(`Instansi ${name} berhasil ditambahkan ke daftar OPD.`, 'OPD Ditambahkan');
    }

    setIsFormOpen(false);
    loadData();
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    opdService.delete(deleteTarget.id);
    toast.success(`OPD ${deleteTarget.name} berhasil dihapus.`, 'OPD Dihapus');
    setDeleteTarget(null);
    loadData();
  };

  const filteredOpds = opds.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      o.name.toLowerCase().includes(q) ||
      o.code.toLowerCase().includes(q) ||
      o.picName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Manajemen OPD / Instansi
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Kelola data Organisasi Perangkat Daerah, kontak penanggung jawab, dan pantau jumlah pengisian survey.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah OPD Baru</span>
        </button>
      </div>

      {/* OPD Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Search */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama OPD, kode satker, atau PIC..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Total {filteredOpds.length} OPD Terdata
          </span>
        </div>

        {/* Mobile Card View (< md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredOpds.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Tidak ada data OPD yang sesuai dengan kriteria pencarian Anda.
            </div>
          ) : (
            filteredOpds.map((opd) => (
              <div key={opd.id} className="p-4 space-y-2.5 hover:bg-slate-50/80 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{opd.name}</h4>
                    <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md font-semibold inline-block mt-0.5">
                      {opd.code}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                      opd.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {opd.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">PIC:</span>
                    <span className="font-medium text-slate-800">{opd.picName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Kontak:</span>
                    <span className="text-slate-700 truncate max-w-[170px] text-right">{opd.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Survey:</span>
                    <span className="font-semibold text-blue-700">{opd.surveyCount} Formulir</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => openEditModal(opd)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-xs rounded-xl transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit OPD</span>
                  </button>
                  <button
                    onClick={() => setDeleteTarget(opd)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors"
                    title="Hapus OPD"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/70">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama OPD / Instansi</th>
                <th className="py-3 px-4">Kode OPD</th>
                <th className="py-3 px-4">Penanggung Jawab (PIC)</th>
                <th className="py-3 px-4">Kontak (Email / Telp)</th>
                <th className="py-3 px-4 text-center">Jumlah Survey</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredOpds.map((opd, idx) => (
                <tr key={opd.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <div>{opd.name}</div>
                    {opd.address && (
                      <div className="text-[11px] text-slate-400 font-normal truncate max-w-xs">
                        {opd.address}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-blue-700">{opd.code}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">{opd.picName}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{opd.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{opd.phone}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-100">
                      <FileSpreadsheet className="w-3 h-3 text-blue-600" />
                      {opd.surveyCount} Formulir
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        opd.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {opd.status === 'active' ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Aktif
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-slate-400" /> Nonaktif
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openEditModal(opd)}
                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Edit OPD"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(opd)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Hapus OPD"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit OPD Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingOpd ? 'Edit Data OPD / Instansi' : 'Tambah OPD Baru'}
        description="Lengkapi informasi unit kerja dan kontak koordinator survey instansi."
        confirmText={editingOpd ? 'Simpan Perubahan' : 'Tambahkan OPD'}
        cancelText="Batal"
        onConfirm={handleSaveOpd}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="font-bold text-slate-700">Nama Lengkap OPD *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Dinas Ketahanan Pangan dan Pertanian"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Kode OPD / Satker *</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="1.09.01"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Nama PIC / Pejabat Penanggung Jawab *</label>
              <input
                type="text"
                value={picName}
                onChange={(e) => setPicName(e.target.value)}
                placeholder="Nama Kepala Dinas / Sekretaris..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Email Instansi</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dinas@tubaba.go.id"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Nomor Telepon Kantor / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(0726) 7575xxx"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="font-bold text-slate-700">Alamat Kantor</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Kompleks Perkantoran Pemda TUBABA, Panaragan..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="font-bold text-slate-700">Status OPD</label>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="opdStatus"
                    value="active"
                    checked={status === 'active'}
                    onChange={() => setStatus('active')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Aktif</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="opdStatus"
                    value="inactive"
                    checked={status === 'inactive'}
                    onChange={() => setStatus('inactive')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Nonaktif</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete OPD Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Data OPD / Instansi?"
        description="Menghapus OPD akan mempengaruhi catatan survey yang terafiliasi dengan instansi ini."
        confirmText="Hapus OPD"
        cancelText="Batal"
        variant="danger"
        onConfirm={handleDelete}
      >
        {deleteTarget && (
          <p className="text-xs text-rose-700 font-medium">
            Hapus OPD: <strong>{deleteTarget.name}</strong> ({deleteTarget.code})
          </p>
        )}
      </Modal>
    </div>
  );
};
