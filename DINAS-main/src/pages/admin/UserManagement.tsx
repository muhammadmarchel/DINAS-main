import React, { useState, useEffect } from 'react';
import { userService } from '../../services/userService';
import { opdService } from '../../services/opdService';
import { useToast } from '../../context/ToastContext';
import { User, OPD, Role } from '../../types';
import { Modal } from '../../components/common/Modal';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  KeyRound,
  Shield,
  UserCheck,
  CheckCircle,
  XCircle,
  Search,
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [opds, setOpds] = useState<OPD[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState<Role>('user');
  const [opdId, setOpdId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'pending'>('active');

  const toast = useToast();

  const loadData = () => {
    const uList = userService.getAll();
    setUsers(uList);
    const oList = opdService.getAll();
    setOpds(oList);
    if (oList.length > 0 && !opdId) {
      setOpdId(oList[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setName('');
    setUsername('');
    setEmail('');
    setPassword('password123');
    setRole('user');
    setOpdId(opds[0]?.id || '');
    setStatus('active');
    setIsFormOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.username);
    setEmail(user.email);
    setPassword('******');
    setRole(user.role);
    setOpdId(user.opdId);
    setStatus(user.status);
    setIsFormOpen(true);
  };

  const handleSaveUser = () => {
    if (!name.trim() || !username.trim() || !email.trim()) {
      toast.warning('Harap isi Nama, Username, dan Email dengan lengkap.', 'Validasi Form');
      return;
    }

    const selectedOpd = opds.find((o) => o.id === opdId) || opds[0];

    if (editingUser) {
      userService.update(editingUser.id, {
        name,
        username,
        email,
        role,
        opdId: selectedOpd?.id || '',
        opdName: selectedOpd?.name || '',
        status,
        ...(password && password !== '******' ? { password: password.trim() } : {}),
      });
      toast.success(`Data pengguna ${username} berhasil diperbarui.`, 'Pengguna Diperbarui');
    } else {
      userService.create({
        name,
        username,
        email,
        password: password.trim() || 'password123',
        role,
        opdId: selectedOpd?.id || '',
        opdName: selectedOpd?.name || '',
        status,
      });
      toast.success(`Pengguna baru ${username} berhasil ditambahkan.`, 'Pengguna Ditambahkan');
    }

    setIsFormOpen(false);
    loadData();
  };

  const handleToggleStatus = (user: User) => {
    userService.toggleStatus(user.id);
    toast.info(
      `Status pengguna ${user.name} diubah menjadi ${user.status === 'active' ? 'Nonaktif' : 'Aktif'}.`,
      'Status Berubah'
    );
    loadData();
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    userService.delete(deleteTarget.id);
    toast.success(`Pengguna ${deleteTarget.name} berhasil dihapus.`, 'Pengguna Dihapus');
    setDeleteTarget(null);
    loadData();
  };

  const handleResetPassword = () => {
    if (!resetTarget) return;
    const res = userService.resetPassword(resetTarget.id);
    toast.success(
      `Kata sandi pengguna ${resetTarget.username} direset ke default: "${res.defaultPass}".`,
      'Kata Sandi Direset'
    );
    setResetTarget(null);
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.opdName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Pengguna Sistem
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Kelola hak akses akun Administrator dan akun Pegawai Organisasi Perangkat Daerah (OPD).
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-colors self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Search */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pengguna berdasarkan nama, username, atau OPD..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Total {filteredUsers.length} akun terdaftar
          </span>
        </div>

        {/* Mobile Card View (< md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Tidak ada data pengguna yang sesuai dengan pencarian Anda.
            </div>
          ) : (
            filteredUsers.map((u) => (
              <div key={u.id} className="p-4 space-y-2.5 hover:bg-slate-50/80 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{u.name}</h4>
                    <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
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
                    <span className="text-slate-400 text-[11px]">Username:</span>
                    <span className="font-mono text-slate-700 font-semibold">{u.username}</span>
                  </div>
                  {u.opdName && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Instansi / OPD:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[170px] text-right">{u.opdName}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-slate-400 text-[11px]">Status Akun:</span>
                    <button
                      onClick={() => handleToggleStatus(u)}
                      disabled={u.username === 'admin'}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all disabled:opacity-50 ${
                        u.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          u.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      <span>{u.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => openEditModal(u)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Akun</span>
                  </button>
                  <button
                    onClick={() => setResetTarget(u)}
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors"
                    title="Reset Kata Sandi"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(u)}
                    disabled={u.username === 'admin'}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors disabled:opacity-30"
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
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Instansi / OPD</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredUsers.map((u, idx) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{u.name}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">{u.username}</td>
                  <td className="py-3.5 px-4 text-slate-600">{u.email}</td>
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
                  <td className="py-3.5 px-4 font-medium text-slate-700">{u.opdName}</td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                        u.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                      title="Klik untuk beralih aktif/nonaktif"
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
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Edit Pengguna"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setResetTarget(u)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Reset Kata Sandi"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(u)}
                        disabled={u.username === 'admin'}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30"
                        title="Hapus Pengguna"
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

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
        description="Lengkapi data akun pengguna untuk akses sistem survey digital TUBABA."
        confirmText={editingUser ? 'Simpan Perubahan' : 'Tambahkan Akun'}
        cancelText="Batal"
        onConfirm={handleSaveUser}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="font-bold text-slate-700">Nama Lengkap & Gelar *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Budi Santoso, S.Kom."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Username *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="budi_tubaba"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Email Resmi *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="budi@tubaba.go.id"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {!editingUser && (
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Kata Sandi Awal *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Peran / Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">User OPD (Pengisi Survey)</option>
                <option value="admin">Administrator Sistem</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="font-bold text-slate-700">Asal OPD / Instansi *</label>
              <select
                value={opdId}
                onChange={(e) => setOpdId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {opds.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="font-bold text-slate-700">Status Akun</label>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
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
                    name="status"
                    value="inactive"
                    checked={status === 'inactive'}
                    onChange={() => setStatus('inactive')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Nonaktif</span>
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
                  <span className="text-amber-700 font-medium">Menunggu Persetujuan (Pending)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Reset Kata Sandi Pengguna"
        description="Kata sandi pengguna ini akan dikembalikan ke kata sandi standar sistem."
        confirmText="Ya, Reset Kata Sandi"
        cancelText="Batal"
        variant="warning"
        onConfirm={handleResetPassword}
      >
        {resetTarget && (
          <p className="text-xs text-slate-600 leading-relaxed">
            Anda akan mereset kata sandi untuk akun <strong>{resetTarget.name}</strong> ({resetTarget.username}). Kata sandi baru sementara adalah <code>Tubaba2026!</code>.
          </p>
        )}
      </Modal>

      {/* Delete User Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Akun Pengguna?"
        description="Akun ini tidak akan dapat masuk kembali ke sistem survey digital TUBABA."
        confirmText="Hapus Akun"
        cancelText="Batal"
        variant="danger"
        onConfirm={handleDelete}
      >
        {deleteTarget && (
          <p className="text-xs text-rose-700 font-medium">
            Hapus pengguna: {deleteTarget.name} ({deleteTarget.username})
          </p>
        )}
      </Modal>
    </div>
  );
};
