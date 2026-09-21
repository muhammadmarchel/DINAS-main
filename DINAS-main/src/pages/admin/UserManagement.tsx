import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { opdService } from '../../services/opdService';
import { OPD } from '../../types';
import { Modal } from '../../components/common/Modal';
import { supabase } from '../../lib/supabase';
import { DAFTAR_INSTANSI } from '../profile/ProfilePage';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  UserCheck,
  CheckCircle,
  XCircle,
  Search,
  Clock,
  RefreshCw,
  Building,
} from 'lucide-react';

export interface DbUser {
  id: number;
  email: string;
  role: string;
  opd_name?: string | null;
  status: string;
  created_at?: string;
}

export const UserManagement: React.FC = () => {
  // State murni dari Supabase, tanpa data tiruan/dummy/mock
  const [users, setUsers] = useState<DbUser[]>([]);
  const [opds, setOpds] = useState<OPD[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<DbUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DbUser | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [opdName, setOpdName] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'pending'>('active');

  const toast = useToast();

  // Ambil data asli langsung dari Supabase
  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('id', { ascending: true });

    setIsLoading(false);

    if (error) {
      console.error('Gagal mengambil data users:', error);
      toast.error('Gagal mengambil data pengguna dari database: ' + error.message, 'Database Error');
      return;
    }

    if (data) {
      setUsers(data); // masukkan ke state daftar user
    }
  };

  useEffect(() => {
    fetchUsers();

    const oList = opdService.getAll();
    setOpds(oList);

    // Realtime listener Supabase: otomatis reload saat ada user login atau berubah status
    const channel = supabase
      .channel('realtime-user-management')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update status langsung ke tabel Supabase users
  const handleUpdateStatus = async (targetUserId: number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', targetUserId);

      if (error) {
        console.error('Gagal update status:', error);
        toast.error('Gagal memperbarui status: ' + error.message, 'Error');
        return;
      }

      toast.success(
        `Status pengguna berhasil diubah menjadi "${newStatus}".`,
        'Status Berhasil Diperbarui'
      );
      fetchUsers();
    } catch (err: any) {
      console.error('Error saat update status pengguna:', err);
      toast.error('Terjadi kesalahan saat memperbarui status.', 'Error');
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setEmail('');
    setRole('user');
    setOpdName(opds[0]?.name || '');
    setStatus('active');
    setIsFormOpen(true);
  };

  const openEditModal = (u: DbUser) => {
    setEditingUser(u);
    setEmail(u.email || '');
    setRole((u.role as 'admin' | 'user') || 'user');
    setOpdName(u.opd_name || '');
    setStatus((u.status as 'active' | 'inactive' | 'pending') || 'active');
    setIsFormOpen(true);
  };

  const handleSaveUser = async () => {
    if (!email.trim()) {
      toast.warning('Email tidak boleh kosong.', 'Validasi Form');
      return;
    }

    if (editingUser) {
      // Update user di Supabase
      const { error } = await supabase
        .from('users')
        .update({
          email: email.trim(),
          role,
          opd_name: opdName || null,
          status,
        })
        .eq('id', editingUser.id);

      if (error) {
        toast.error('Gagal memperbarui pengguna: ' + error.message, 'Error');
        return;
      }

      toast.success(`Data pengguna ${email} berhasil diperbarui.`, 'Pengguna Diperbarui');
    } else {
      // Insert user baru di Supabase
      const { error } = await supabase
        .from('users')
        .insert([
          {
            email: email.trim(),
            role,
            opd_name: opdName || null,
            status,
          },
        ]);

      if (error) {
        toast.error('Gagal menambahkan pengguna: ' + error.message, 'Error');
        return;
      }

      toast.success(`Pengguna baru ${email} berhasil ditambahkan.`, 'Pengguna Ditambahkan');
    }

    setIsFormOpen(false);
    fetchUsers();
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', deleteTarget.id);

    if (error) {
      toast.error('Gagal menghapus pengguna: ' + error.message, 'Error');
      return;
    }

    toast.success(`Pengguna ${deleteTarget.email} berhasil dihapus dari database.`, 'Pengguna Dihapus');
    setDeleteTarget(null);
    fetchUsers();
  };

  const pendingUsers = users.filter((u) => u.status === 'pending');

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q)) ||
      (u.opd_name && u.opd_name.toLowerCase().includes(q)) ||
      (u.status && u.status.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Manajemen Pengguna Sistem
            </h2>
            {isLoading && (
              <span title="Memuat data dari database Supabase...">
                <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Daftar akun riil dari database Supabase untuk akun Administrator dan Pegawai Organisasi Perangkat Daerah (OPD).
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => fetchUsers()}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            title="Muat ulang data dari database Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Pengguna</span>
          </button>
        </div>
      </div>

      {/* Pending approval notice banner */}
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5 sm:mt-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Ada {pendingUsers.length} Akun Baru Menunggu Persetujuan (Pending)
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Pengguna berikut baru mendaftar dan menunggu persetujuan status active:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {pendingUsers.map((pu) => (
                  <span
                    key={pu.id}
                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-100/80 text-amber-900 text-xs font-semibold border border-amber-300/60"
                  >
                    <span>{pu.email}</span>
                    <button
                      onClick={() => handleUpdateStatus(pu.id, 'active')}
                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-colors"
                      title="Klik untuk menyetujui akun menjadi active"
                    >
                      Setujui
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Search & Counter */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan email, OPD, atau role..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Total {filteredUsers.length} akun di database
          </span>
        </div>

        {/* Mobile View (< md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {isLoading ? 'Memuat data dari database...' : 'Tidak ada data pengguna di database.'}
            </div>
          ) : (
            filteredUsers.map((u, idx) => (
              <div
                key={u.id}
                className={`p-4 space-y-2.5 hover:bg-slate-50/80 transition-colors ${
                  u.status === 'pending' ? 'bg-amber-50/40' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 font-mono">#{idx + 1} (ID: {u.id})</span>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{u.email}</h4>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                      u.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {u.role === 'admin' ? (
                      <>
                        <Shield className="w-3 h-3" /> Admin
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3 h-3" /> User OPD
                      </>
                    )}
                  </span>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">OPD:</span>
                    <span className="font-medium text-slate-800 truncate max-w-[190px] text-right">
                      {u.opd_name || '(Belum Ditentukan)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-slate-400 text-[11px]">Status:</span>
                    {u.status === 'pending' ? (
                      <button
                        onClick={() => handleUpdateStatus(u.id, 'active')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-emerald-100 hover:text-emerald-800 border border-amber-300 transition-colors shadow-xs animate-pulse"
                        title="Klik untuk menyetujui akun menjadi active"
                      >
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Menunggu (Klik Setujui)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          handleUpdateStatus(u.id, u.status === 'active' ? 'inactive' : 'active')
                        }
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                          u.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                        title="Klik untuk mengubah status"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{u.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => openEditModal(u)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit User</span>
                  </button>
                  <button
                    onClick={() => setDeleteTarget(u)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors"
                    title="Hapus Pengguna"
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
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">OPD</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {isLoading ? 'Memuat data dari database Supabase...' : 'Tidak ada data pengguna di database.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => (
                  <tr
                    key={u.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      u.status === 'pending' ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{u.email}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {u.role === 'admin' ? (
                          <>
                            <Shield className="w-3 h-3" /> Admin
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3" /> User OPD
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {u.opd_name || (
                        <span className="text-slate-400 italic">(Belum Ditentukan)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {u.status === 'pending' ? (
                        <button
                          onClick={() => handleUpdateStatus(u.id, 'active')}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 hover:bg-emerald-100 hover:text-emerald-800 transition-all border border-amber-300 shadow-xs animate-pulse"
                          title="Klik untuk menyetujui akun menjadi active"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Menunggu (Klik Setujui)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            handleUpdateStatus(u.id, u.status === 'active' ? 'inactive' : 'active')
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                            u.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title="Klik untuk mengubah status aktif / nonaktif"
                        >
                          {u.status === 'active' ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Aktif
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" /> Nonaktif
                            </>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Edit OPD / Role / Status"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus Pengguna"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
        description="Kelola data akun pengguna langsung di database Supabase."
        confirmText={editingUser ? 'Simpan Perubahan' : 'Tambahkan Akun'}
        cancelText="Batal"
        onConfirm={handleSaveUser}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Email Akun (Google/Resmi) *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@tubaba.go.id atau user@gmail.com"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Peran / Role *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="user">User OPD (Pengisi Survey)</option>
              <option value="admin">Administrator Sistem</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Instansi / OPD</label>
            <select
              value={opdName}
              onChange={(e) => setOpdName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Belum Ditentukan / Bebas --</option>
              {DAFTAR_INSTANSI.map((nama) => (
                <option key={nama} value={nama}>
                  {nama}
                </option>
              ))}
              {opdName && !DAFTAR_INSTANSI.includes(opdName) && (
                <option value={opdName}>{opdName}</option>
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Status Akun</label>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={status === 'active'}
                  onChange={() => setStatus('active')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-emerald-700">active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="pending"
                  checked={status === 'pending'}
                  onChange={() => setStatus('pending')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className="font-semibold text-amber-700">pending</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="inactive"
                  checked={status === 'inactive'}
                  onChange={() => setStatus('inactive')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-600">inactive</span>
              </label>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete User Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Akun Pengguna?"
        description="Akun ini akan dihapus langsung dari database Supabase."
        confirmText="Hapus Akun"
        cancelText="Batal"
        variant="danger"
        onConfirm={handleDeleteUser}
      >
        {deleteTarget && (
          <p className="text-xs text-rose-700 font-medium">
            Hapus pengguna dari database: <strong>{deleteTarget.email}</strong> (ID: {deleteTarget.id})
          </p>
        )}
      </Modal>
    </div>
  );
};
