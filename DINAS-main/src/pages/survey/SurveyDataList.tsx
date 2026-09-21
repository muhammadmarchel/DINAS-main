import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { surveyService } from '../../services/surveyService';
import { opdService } from '../../services/opdService';
import { SURVEY_FORM_CONFIGS } from '../../data/surveyConfigs';
import { SurveySubmission, OPD, SurveyStatus, SurveyCategoryKey } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  Edit,
  Trash2,
  FilePlus,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const SurveyDataList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get('category') || 'all';

  const { currentUser, isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<SurveySubmission[]>([]);
  const [opds, setOpds] = useState<OPD[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpd, setSelectedOpd] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sort states
  const [sortField, setSortField] = useState<keyof SurveySubmission>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modals
  const [deleteTarget, setDeleteTarget] = useState<SurveySubmission | null>(null);

  const loadData = async () => {
    const all = surveyService.getAll();
    setSubmissions(all);
    const allOpds = opdService.getAll();
    setOpds(allOpds);

    try {
      const fresh = await surveyService.syncRemote();
      setSubmissions(fresh);
    } catch (e) {
      console.warn('Sync notice:', e);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime-list-surveys')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter logic
  const filteredData = useMemo(() => {
    return submissions.filter((s) => {
      // Role scope: if not admin, only see own user or own OPD submissions
      if (!isAdmin && currentUser) {
        const belongsToUser = s.createdByUserId === currentUser.id || s.opdId === currentUser.opdId;
        if (!belongsToUser) return false;
      }

      // Search keyword
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          s.opdName.toLowerCase().includes(q) ||
          s.respondent.respondentName.toLowerCase().includes(q) ||
          s.surveyTitle.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.createdByName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // OPD filter
      if (selectedOpd !== 'all' && s.opdId !== selectedOpd) return false;

      // Category filter
      if (selectedCategory !== 'all' && s.surveyCategory !== selectedCategory) return false;

      // Status filter
      if (selectedStatus !== 'all' && s.status !== selectedStatus) return false;

      // Date range filter
      if (startDate && s.createdAt < startDate) return false;
      if (endDate && s.createdAt > `${endDate}T23:59:59Z`) return false;

      return true;
    });
  }, [submissions, searchQuery, selectedOpd, selectedCategory, selectedStatus, startDate, endDate, isAdmin, currentUser]);

  // Sort logic
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA: string | number = (a[sortField] as any) ?? '';
      let valB: string | number = (b[sortField] as any) ?? '';

      if (sortField === 'updatedAt') {
        valA = new Date(a.updatedAt).getTime();
        valB = new Date(b.updatedAt).getTime();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortAsc]);

  // Paginated
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedOpd('all');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    toast.info('Filter pencarian telah direset.');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await surveyService.delete(deleteTarget.id);
    toast.success(`Data survey ${deleteTarget.id} berhasil dihapus.`, 'Data Dihapus');
    setDeleteTarget(null);
    loadData();
  };

  const handleExportCSV = () => {
    surveyService.exportToCSV(sortedData);
    toast.success(`Berhasil mengunduh rekap ${sortedData.length} data survey.`, 'Export Data');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export controls */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Data Survey Digital
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {isAdmin
              ? 'Kelola, verifikasi, filter, dan unduh data hasil survey seluruh OPD di Kabupaten TUBABA.'
              : 'Daftar dan status berkas formulir survey yang dikelola oleh instansi Anda.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Print</span>
          </button>
          <button
            onClick={() => navigate('/form-survey')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-colors"
          >
            <FilePlus className="w-4 h-4" />
            <span>Isi Survey Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filter & Pencarian Data</span>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Filter
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama OPD, nama responden, jenis survey, atau ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* OPD filter (visible to Admin) */}
          <div>
            <select
              value={selectedOpd}
              onChange={(e) => {
                setSelectedOpd(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua OPD / Instansi</option>
              {opds.map((opd) => (
                <option key={opd.id} value={opd.id}>
                  {opd.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua 5 Kategori Survey</option>
              {Object.keys(SURVEY_FORM_CONFIGS).map((key) => (
                <option key={key} value={key}>
                  {SURVEY_FORM_CONFIGS[key as SurveyCategoryKey].shortName}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="Diverifikasi">Diverifikasi</option>
              <option value="Terkirim">Terkirim</option>
              <option value="Perlu Perbaikan">Perlu Perbaikan</option>
              <option value="Draft">Draft</option>
            </select>
          </div>

          {/* Date from */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              title="Tanggal Awal"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date to */}
          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              title="Tanggal Akhir"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sort field */}
          <div>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
            >
              <span>Urutan: {sortAsc ? 'Terlama / A-Z' : 'Terbaru / Z-A'}</span>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:px-6 flex items-center justify-between bg-slate-50/50 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-600">
            Menampilkan {sortedData.length} data survey
          </span>
          <span className="text-xs text-slate-400">
            Halaman {currentPage} dari {totalPages}
          </span>
        </div>

        {/* Mobile Card View (< md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {paginatedData.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Tidak ada data survey yang cocok dengan kriteria filter pencarian Anda.
            </div>
          ) : (
            paginatedData.map((s) => (
              <div key={s.id} className="p-4 space-y-2.5 hover:bg-slate-50/80 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{s.opdName}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{s.id}</p>
                  </div>
                  <StatusBadge status={s.status} size="sm" />
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Responden:</span>
                    <span className="font-medium text-slate-800 truncate max-w-[180px] text-right">
                      {s.respondent.respondentName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Kategori:</span>
                    <span className="font-semibold text-blue-700">{s.surveyCategory}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Tanggal:</span>
                    <span>{s.respondent.fillDate || new Date(s.createdAt).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => navigate(`/survey/detail/${s.id}`)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Detail</span>
                  </button>
                  {(isAdmin || s.status === 'Draft' || s.status === 'Perlu Perbaikan') && (
                    <button
                      onClick={() =>
                        navigate(
                          `/survey/form/${s.surveyCategory.toLowerCase().replace(/_/g, '-')}?edit=${s.id}`
                        )
                      }
                      className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-colors"
                      title="Edit Data Survey"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => setDeleteTarget(s)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors"
                      title="Hapus Data Survey"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
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
                <th className="py-3 px-4">Instansi / OPD</th>
                <th className="py-3 px-4">Nama Responden</th>
                <th className="py-3 px-4">Jenis Survey</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Dibuat Oleh</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada data survey yang cocok dengan kriteria filter pencarian Anda.
                  </td>
                </tr>
              ) : (
                paginatedData.map((s, index) => {
                  const itemIndex = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center text-slate-400 font-medium">
                        {itemIndex}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div>{s.opdName}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{s.id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{s.respondent.respondentName}</div>
                        <div className="text-[11px] text-slate-500">{s.respondent.position}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800">{s.surveyCategory}</span>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                          {s.surveyTitle}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {s.respondent.fillDate || new Date(s.createdAt).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={s.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {s.createdByName}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => navigate(`/survey/detail/${s.id}`)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Lihat Detail Survey"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(isAdmin || s.status === 'Draft' || s.status === 'Perlu Perbaikan') && (
                            <button
                              onClick={() =>
                                navigate(
                                  `/survey/form/${s.surveyCategory.toLowerCase().replace(/_/g, '-')}?edit=${s.id}`
                                )
                              }
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Edit Data Survey"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteTarget(s)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Hapus Data Survey"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="p-4 sm:px-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Total {sortedData.length} formulir terdaftar
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Konfirmasi Hapus Data Survey"
        description="Apakah Anda yakin ingin menghapus data formulir survey ini?"
        confirmText="Ya, Hapus Data"
        cancelText="Batal"
        variant="danger"
        onConfirm={handleDelete}
      >
        {deleteTarget && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 space-y-1">
            <p className="font-semibold">ID Survey: {deleteTarget.id}</p>
            <p>OPD: {deleteTarget.opdName}</p>
            <p>Kategori: {deleteTarget.surveyCategory}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};
