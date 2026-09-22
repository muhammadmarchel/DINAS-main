import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { surveyService } from '../../services/surveyService';
import { opdService } from '../../services/opdService';
import { userService } from '../../services/userService';
import { useToast } from '../../context/ToastContext';
import { SurveySubmission, OPD } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Building2,
  Users,
  Eye,
  Edit,
  Trash2,
  PlusCircle,
  BarChart2,
  PieChart,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

import { supabase } from '../../lib/supabase';

export const AdminDashboard: React.FC = () => {
  const [submissions, setSubmissions] = useState<SurveySubmission[]>([]);
  const [opds, setOpds] = useState<OPD[]>([]);
  const [userCount, setUserCount] = useState<number>(0);
  const [deleteTarget, setDeleteTarget] = useState<SurveySubmission | null>(null);

  const toast = useToast();
  const navigate = useNavigate();

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
      console.warn('Error fetching surveys:', e);
      setSubmissions([]);
    }

    const allOpds = opdService.getAll();
    setOpds(allOpds);

    try {
      const freshUsers = await userService.syncRemote();
      setUserCount(freshUsers.length);
    } catch (e) {
      console.warn('Sync users notice:', e);
    }
  };

  useEffect(() => {
    loadData();

    // Realtime listener Supabase
    const surveysChannel = supabase
      .channel('realtime-admin-surveys')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' }, () => {
        loadData();
      })
      .subscribe();

    const usersChannel = supabase
      .channel('realtime-admin-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(surveysChannel);
      supabase.removeChannel(usersChannel);
    };
  }, []);

  const stats = {
    total: submissions.length,
    diverifikasi: submissions.filter((s) => s.status === 'Diverifikasi').length,
    terkirim: submissions.filter((s) => s.status === 'Terkirim').length,
    draft: submissions.filter((s) => s.status === 'Draft').length,
    perluPerbaikan: submissions.filter((s) => s.status === 'Perlu Perbaikan').length,
    sudahDiisi: submissions.filter((s) => s.status === 'Terkirim' || s.status === 'Diverifikasi').length,
    belumDiisi: submissions.filter((s) => s.status === 'Draft').length,
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await surveyService.delete(deleteTarget.id);
    toast.success(`Data survey ${deleteTarget.id} berhasil dihapus.`, 'Data Dihapus');
    setDeleteTarget(null);
    loadData();
  };

  // Prepare chart data
  // 1. Survey per OPD top 5
  const opdChartData = opds
    .map((o) => ({
      name: o.name,
      count: submissions.filter((s) => s.opdId === o.id).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxOpdCount = Math.max(...opdChartData.map((d) => d.count), 1);

  // 2. Status survey distribution
  const statusCounts = {
    Diverifikasi: submissions.filter((s) => s.status === 'Diverifikasi').length,
    Terkirim: submissions.filter((s) => s.status === 'Terkirim').length,
    'Perlu Perbaikan': submissions.filter((s) => s.status === 'Perlu Perbaikan').length,
    Draft: submissions.filter((s) => s.status === 'Draft').length,
  };

  const totalStatus = submissions.length || 1;

  // 3. Recent 6 surveys
  const recentSurveys = submissions.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-linear-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-950/10 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-700/60 border border-blue-500/40 text-blue-200 text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Portal Administrator Resmi Pemkab TUBABA
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight">
            SURVEY PENYUSUNAN ARSITEKTUR PEMERINTAHAN DIGITAL (PEMDI) 2026
          </h2>
          <p className="text-blue-100 text-xs sm:text-sm mt-2 leading-relaxed font-normal">
            Selamat datang di Portal Survei Arsitektur Pemerintahan Digital (PEMDI) TUBABA 2026. Pantau pemenuhan survey, data OPD, verifikasi berkas, dan analisa laporan statistik terpadu.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Link
              to="/form-survey"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-900 rounded-xl text-xs font-bold shadow-md hover:bg-blue-50 transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-blue-700" />
              Kelola Form Survey
            </Link>
            <Link
              to="/data-survey"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700/50 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold border border-blue-500/40 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Lihat Seluruh Data
            </Link>
          </div>
        </div>

        {/* Decorative backdrop graphics */}
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">
          <img src="/logo-tubaba.svg" alt="TUBABA Seal" className="w-80 h-80 object-contain" />
        </div>
      </div>

      {/* 5 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Data Survey"
          value={stats.total}
          subtitle="Akumulasi seluruh formulir"
          icon={FileSpreadsheet}
          color="blue"
          trend="+14% bln ini"
          trendPositive={true}
        />
        <StatCard
          title="Survey Sudah Diisi"
          value={stats.sudahDiisi}
          subtitle="Terkirim & Terverifikasi"
          icon={CheckCircle2}
          color="emerald"
          trend="82% progres"
          trendPositive={true}
        />
        <StatCard
          title="Survey Belum Selesai"
          value={stats.belumDiisi}
          subtitle="Draft / Perlu Tindak Lanjut"
          icon={Clock}
          color="amber"
          trend="Perlu monitoring"
          trendPositive={false}
        />
        <StatCard
          title="Total OPD / Instansi"
          value={opds.length}
          subtitle="Terdaftar aktif di sistem"
          icon={Building2}
          color="purple"
        />
        <StatCard
          title="Total Pengguna"
          value={userCount}
          subtitle="Admin & Pegawai OPD"
          icon={Users}
          color="slate"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Survey per OPD */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Survey Per OPD (Top 5)</h3>
              </div>
              <Link to="/data-survey" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5">
                Lihat Survey <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3.5 mt-4">
              {opdChartData.map((d, i) => {
                const percentage = Math.round((d.count / maxOpdCount) * 100);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 truncate max-w-[200px]" title={d.name}>
                        {d.name}
                      </span>
                      <span className="font-bold text-slate-900">{d.count} Survey</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-blue-500 to-blue-700 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
            Diperbarui secara otomatis berdasarkan input OPD terkini.
          </p>
        </div>

        {/* Chart 2: Status Distribution */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">Distribusi Status Survey</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">{submissions.length} Total</span>
            </div>

            <div className="space-y-3 mt-4">
              {/* Diverifikasi */}
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-900">Diverifikasi</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-800">{statusCounts.Diverifikasi}</span>
                  <span className="text-[10px] text-emerald-600 ml-1.5">
                    ({Math.round((statusCounts.Diverifikasi / totalStatus) * 100)}%)
                  </span>
                </div>
              </div>

              {/* Terkirim */}
              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-xs font-semibold text-blue-900">Terkirim (Menunggu)</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-blue-800">{statusCounts.Terkirim}</span>
                  <span className="text-[10px] text-blue-600 ml-1.5">
                    ({Math.round((statusCounts.Terkirim / totalStatus) * 100)}%)
                  </span>
                </div>
              </div>

              {/* Perlu Perbaikan */}
              <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-xs font-semibold text-rose-900">Perlu Perbaikan</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-rose-800">{statusCounts['Perlu Perbaikan']}</span>
                  <span className="text-[10px] text-rose-600 ml-1.5">
                    ({Math.round((statusCounts['Perlu Perbaikan'] / totalStatus) * 100)}%)
                  </span>
                </div>
              </div>

              {/* Draft */}
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-xs font-semibold text-amber-900">Draft Responden</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-amber-800">{statusCounts.Draft}</span>
                  <span className="text-[10px] text-amber-600 ml-1.5">
                    ({Math.round((statusCounts.Draft / totalStatus) * 100)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
            Status Terkirim siap ditindaklanjuti verifikasinya oleh Admin.
          </p>
        </div>

        {/* Chart 3: Monthly Trend / Aktivitas Pengisian */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">Aktivitas Survey Bulanan</h3>
              </div>
              <span className="text-xs text-indigo-700 bg-indigo-50 font-bold px-2 py-0.5 rounded-full">
                T.A 2026
              </span>
            </div>

            {/* Empty/Zeroed monthly activity */}
            <div className="mt-6 flex items-end justify-between h-40 pt-4 px-2">
              {[
                { month: 'Jan', count: 0, height: '0%' },
                { month: 'Feb', count: 0, height: '0%' },
                { month: 'Mar', count: 0, height: '0%' },
                { month: 'Apr', count: 0, height: '0%' },
                { month: 'Mei', count: 0, height: '0%' },
                { month: 'Jun', count: 0, height: '0%' },
              ].map((bar, i) => (
                <div key={i} className="flex flex-col items-center gap-2 flex-1">
                  <span className="text-[10px] font-bold text-slate-400">{bar.count}</span>
                  <div className="w-6 sm:w-8 bg-slate-100 rounded-t-lg h-28 relative flex items-end justify-center overflow-hidden">
                    <div
                      className="w-full rounded-t-lg bg-slate-300 transition-all duration-700"
                      style={{ height: bar.height }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {bar.month}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
            Belum ada aktivitas pengisian survey pada periode ini.
          </p>
        </div>
      </div>

      {/* Tabel: Survey Terbaru */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Survey Terbaru</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar formulir survey yang baru saja masuk atau diperbarui oleh OPD.
            </p>
          </div>
          <Link
            to="/data-survey"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors self-start sm:self-auto"
          >
            <span>Buka Semua Data Survey</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Mobile Card View (< md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {recentSurveys.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">Belum ada survey yang masuk.</div>
          ) : (
            recentSurveys.map((survey) => (
              <div key={survey.id} className="p-4 space-y-2.5 hover:bg-slate-50/80 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{survey.opdName}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{survey.id}</p>
                  </div>
                  <StatusBadge status={survey.status} size="sm" />
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Responden:</span>
                    <span className="font-medium text-slate-800 truncate max-w-[180px] text-right">
                      {survey.respondent.respondentName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Kategori:</span>
                    <span className="font-semibold text-blue-700">{survey.surveyCategory}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Tanggal:</span>
                    <span>{survey.respondent.fillDate || new Date(survey.createdAt).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => navigate(`/survey/detail/${survey.id}`)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Detail</span>
                  </button>
                  <button
                    onClick={() => navigate(`/survey/form/${survey.surveyCategory.toLowerCase()}?edit=${survey.id}`)}
                    className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-colors"
                    title="Edit Data Survey"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(survey)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors"
                    title="Hapus Data Survey"
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
                <th className="py-3 px-4">Instansi / OPD</th>
                <th className="py-3 px-4">Nama Responden</th>
                <th className="py-3 px-4">Jenis Survey</th>
                <th className="py-3 px-4">Tanggal Pengisian</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {recentSurveys.map((survey, index) => (
                <tr key={survey.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 text-center text-slate-400 font-medium">
                    {index + 1}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <div>{survey.opdName}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{survey.id}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800">{survey.respondent.respondentName}</div>
                    <div className="text-[11px] text-slate-500">{survey.respondent.position}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-medium text-slate-800">{survey.surveyCategory}</span>
                    <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                      {survey.surveyTitle}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                    {survey.respondent.fillDate || new Date(survey.createdAt).toLocaleDateString('id-ID')}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <StatusBadge status={survey.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => navigate(`/survey/detail/${survey.id}`)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Lihat Detail Survey"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/survey/form/${survey.surveyCategory.toLowerCase()}?edit=${survey.id}`)}
                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Edit Data Survey"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(survey)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Hapus Data Survey"
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Data Survey?"
        description="Tindakan ini tidak dapat dibatalkan. Seluruh jawaban formulir survey ini akan dihapus permanen dari sistem."
        confirmText="Ya, Hapus Data"
        cancelText="Batal"
        variant="danger"
        onConfirm={handleDelete}
      >
        {deleteTarget && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 space-y-1">
            <p className="font-semibold">ID Survey: {deleteTarget.id}</p>
            <p>OPD: {deleteTarget.opdName}</p>
            <p>Responden: {deleteTarget.respondent.respondentName}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};
