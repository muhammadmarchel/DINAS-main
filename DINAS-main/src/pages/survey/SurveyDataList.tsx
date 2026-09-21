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
  X,
  Building2,
  Calendar,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const SurveyDataList: React.FC = () => {
  const [searchParams] = useSearchParams();

  const { currentUser, isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<SurveySubmission[]>([]);
  const [opds, setOpds] = useState<OPD[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstansi, setSelectedInstansi] = useState<string>(() => {
    const p = searchParams.get('category');
    if (!p || p === 'all') return 'all';
    const up = p.toUpperCase();
    if (up === 'DISKOMINFO') return 'DISKOMINFO';
    if (up === 'BPKSDM' || up === 'BKPSDM') return 'BKPSDM';
    if (up === 'BAPPEDA') return 'BAPPEDA';
    if (up.includes('ORGANISASI')) return 'BAGIAN_ORGANISASI';
    if (up.includes('DINAS')) return 'DINAS_TEKNIS';
    return 'all';
  });
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sort states
  const [sortField, setSortField] = useState<keyof SurveySubmission>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modals
  const [deleteTarget, setDeleteTarget] = useState<SurveySubmission | null>(null);

  const loadData = async () => {
    try {
      const { data: surveyList, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Gagal memuat survey dari Supabase:', error.message);
        setSubmissions([]);
      } else if (surveyList) {
        const formatted = surveyService.formatRemoteSurveys(surveyList);
        setSubmissions(formatted);
        surveyService.setAll(formatted);
      }
    } catch (e) {
      console.warn('Sync notice:', e);
      setSubmissions([]);
    }

    const allOpds = opdService.getAll();
    setOpds(allOpds);
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

  // 5 Instansi Tabs definition
  const INSTANSI_TABS = [
    { key: 'all', label: 'Semua Instansi', short: 'Semua' },
    { key: 'DISKOMINFO', label: 'DISKOMINFO', short: 'Diskominfo' },
    { key: 'BKPSDM', label: 'BKPSDM', short: 'BKPSDM' },
    { key: 'BAPPEDA', label: 'BAPPEDA', short: 'Bappeda' },
    { key: 'BAGIAN_ORGANISASI', label: 'BAGIAN ORGANISASI', short: 'Bag. Organisasi' },
    { key: 'DINAS_TEKNIS', label: 'DINAS TEKNIS', short: 'Dinas Teknis' },
  ];

  // Status Tabs definition
  const STATUS_TABS = [
    { key: 'all', label: 'Semua Status' },
    { key: 'Terkirim', label: 'Terkirim', dotColor: 'bg-blue-500' },
    { key: 'Diverifikasi', label: 'Diverifikasi', dotColor: 'bg-emerald-500' },
    { key: 'Perlu Perbaikan', label: 'Perlu Perbaikan', dotColor: 'bg-amber-500' },
    { key: 'Draft', label: 'Draft', dotColor: 'bg-slate-400' },
  ];

  // Helper matching instansi
  const matchesInstansi = (s: SurveySubmission, key: string): boolean => {
    if (key === 'all') return true;
    const opd = (s.opdName || '').toUpperCase();
    const cat = (s.surveyCategory || '').toUpperCase();

    switch (key) {
      case 'DISKOMINFO':
        return cat === 'DISKOMINFO' || opd.includes('DISKOMINFO') || opd.includes('KOMUNIKASI');
      case 'BKPSDM':
        return cat === 'BPKSDM' || cat === 'BKPSDM' || opd.includes('BKPSDM') || opd.includes('KEPEGAWAIAN');
      case 'BAPPEDA':
        return cat === 'BAPPEDA' || opd.includes('BAPPEDA') || opd.includes('PERENCANAAN');
      case 'BAGIAN_ORGANISASI':
        return cat === 'BAGIAN_ORGANISASI_DATA' || cat.includes('ORGANISASI') || opd.includes('ORGANISASI');
      case 'DINAS_TEKNIS':
        return cat === 'DINAS' || opd.includes('DINAS TEKNIS') || (opd.includes('DINAS') && !opd.includes('KOMUNIKASI'));
      default:
        return cat === key.toUpperCase() || opd.includes(key.toUpperCase());
    }
  };

  // Base submissions accessible to current user
  const accessibleSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      if (!isAdmin && currentUser) {
        const belongsToUser =
          s.createdByUserId === currentUser.id ||
          s.createdByUserId === currentUser.email ||
          s.respondent?.email === currentUser.email ||
          (currentUser.opdId && s.opdId === currentUser.opdId) ||
          (currentUser.opdName && s.opdName && s.opdName.toLowerCase() === currentUser.opdName.toLowerCase());
        if (!belongsToUser) return false;
      }
      return true;
    });
  }, [submissions, isAdmin, currentUser]);

  // Counts per instansi tab
  const instansiCounts = useMemo(() => {
    const counts: Record<string, number> = { all: accessibleSubmissions.length };
    INSTANSI_TABS.forEach((tab) => {
      if (tab.key !== 'all') {
        counts[tab.key] = accessibleSubmissions.filter((s) => matchesInstansi(s, tab.key)).length;
      }
    });
    return counts;
  }, [accessibleSubmissions]);

  // Counts per status tab
  const statusCounts = useMemo(() => {
    const base = selectedInstansi === 'all'
      ? accessibleSubmissions
      : accessibleSubmissions.filter((s) => matchesInstansi(s, selectedInstansi));

    const counts: Record<string, number> = {
      all: base.length,
      Terkirim: base.filter((s) => s.status === 'Terkirim').length,
      Diverifikasi: base.filter((s) => s.status === 'Diverifikasi').length,
      'Perlu Perbaikan': base.filter((s) => s.status === 'Perlu Perbaikan').length,
      Draft: base.filter((s) => s.status === 'Draft').length,
    };
    return counts;
  }, [accessibleSubmissions, selectedInstansi]);

  // Filter logic
  const filteredData = useMemo(() => {
    return accessibleSubmissions.filter((s) => {
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

      // Instansi
      if (!matchesInstansi(s, selectedInstansi)) return false;

      // Status
      if (selectedStatus !== 'all' && s.status !== selectedStatus) return false;

      // Date range
      if (startDate && s.createdAt < startDate) return false;
      if (endDate && s.createdAt > `${endDate}T23:59:59Z`) return false;

      return true;
    });
  }, [accessibleSubmissions, searchQuery, selectedInstansi, selectedStatus, startDate, endDate]);

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

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedInstansi !== 'all' ||
    selectedStatus !== 'all' ||
    startDate !== '' ||
    endDate !== '';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedInstansi('all');
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

      {/* Simplified, 1-Click Filter Experience */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        {/* Search Row & Quick Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Unified Fast Search Bar with Clear (X) */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari cepat instansi, nama responden, jenis survey, atau ID..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/70 transition-colors"
                title="Hapus teks pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Advanced (Date & Sort) Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 border rounded-xl text-xs font-semibold transition-all ${
                showAdvanced || startDate || endDate
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Tanggal & Urutan</span>
              {(startDate || endDate) && (
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              )}
              {showAdvanced ? (
                <ChevronUp className="w-3 h-3 text-blue-600" />
              ) : (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              )}
            </button>

            {/* Reset Button (visible when any filter is active) */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors"
                title="Reset semua filter"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* 1-Click Instansi Pills */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              Pilih Instansi / OPD (5 Instansi Tubaba):
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Klik untuk filter cepat</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {INSTANSI_TABS.map((tab) => {
              const isSelected = selectedInstansi === tab.key;
              const count = instansiCounts[tab.key] ?? 0;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setSelectedInstansi(tab.key);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/25 ring-2 ring-blue-600 ring-offset-1'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : count > 0
                        ? 'bg-slate-200 text-slate-800'
                        : 'bg-slate-200/60 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 1-Click Status Pills */}
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Status Survey:
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {STATUS_TABS.map((tab) => {
              const isSelected = selectedStatus === tab.key;
              const count = statusCounts[tab.key] ?? 0;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setSelectedStatus(tab.key);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap font-medium transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white font-bold shadow-sm ring-2 ring-slate-900 ring-offset-1'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
                  }`}
                >
                  {tab.dotColor && (
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : tab.dotColor}`} />
                  )}
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Collapsible Advanced Panel: Tanggal & Urutan */}
        {showAdvanced && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/60 p-3.5 rounded-xl">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-600" />
                <span>Dari Tanggal</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-600" />
                <span>Sampai Tanggal</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-blue-600" />
                <span>Urutan Waktu Data</span>
              </label>
              <button
                type="button"
                onClick={() => setSortAsc(!sortAsc)}
                className="w-full flex items-center justify-between px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
              >
                <span>{sortAsc ? 'Terlama (A-Z)' : 'Terbaru (Z-A)'}</span>
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {(startDate || endDate) && (
              <div className="sm:col-span-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold inline-flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Hapus Filter Tanggal
                </button>
              </div>
            )}
          </div>
        )}

        {/* Active Filter Chips indicator */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] font-medium mr-1">Filter aktif:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[11px] font-medium">
                Pencarian: "{searchQuery}"
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:text-blue-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedInstansi !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[11px] font-medium">
                Instansi: {INSTANSI_TABS.find((t) => t.key === selectedInstansi)?.label}
                <button
                  type="button"
                  onClick={() => setSelectedInstansi('all')}
                  className="hover:text-blue-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-[11px] font-medium">
                Status: {selectedStatus}
                <button
                  type="button"
                  onClick={() => setSelectedStatus('all')}
                  className="hover:text-slate-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-medium">
                Periode: {startDate || 'Awal'} s/d {endDate || 'Sekarang'}
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="hover:text-amber-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-bold ml-1"
            >
              Hapus Semua
            </button>
          </div>
        )}
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
