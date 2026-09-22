import React, { useState, useMemo } from 'react';
import { reportService } from '../../services/reportService';
import { opdService } from '../../services/opdService';
import { surveyService } from '../../services/surveyService';
import { SURVEY_FORM_CONFIGS } from '../../data/surveyConfigs';
import { useToast } from '../../context/ToastContext';
import { StatCard } from '../../components/common/StatCard';
import {
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  Clock,
  Filter,
  RotateCcw,
  Building,
  TrendingUp,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const toast = useToast();
  const opds = opdService.getAll();

  // Filters
  const [selectedOpd, setSelectedOpd] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const reportData = useMemo(() => {
    return reportService.getFilteredReport({
      opdId: selectedOpd,
      category: selectedCategory,
      status: selectedStatus,
      startDate,
      endDate,
    });
  }, [selectedOpd, selectedCategory, selectedStatus, startDate, endDate]);

  const handleExportExcel = () => {
    surveyService.exportToCSV(reportData.rawSurveys);
    toast.success('File laporan Excel (CSV) berhasil diunduh.', 'Ekspor Excel');
  };

  const handleExportPDF = () => {
    toast.info('Menyiapkan format dokumen cetak resmi PDF TUBABA...', 'Ekspor PDF');
    window.print();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setSelectedOpd('all');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setStartDate('');
    setEndDate('');
    toast.info('Filter laporan telah dikembalikan ke awal.');
  };

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Laporan Rekapitulasi Survey
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Analisis dan evaluasi tingkat partisipasi pengisian formulir survey digital Pemkab Tulang Bawang Barat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 no-print">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Laporan</span>
          </button>
        </div>
      </div>

      {/* Filter Section (no-print) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3 no-print">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filter Rekapitulasi Laporan</span>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Instansi / OPD</label>
            <select
              value={selectedOpd}
              onChange={(e) => setSelectedOpd(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Instansi</option>
              {opds.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jenis Survey</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua 5 Kategori</option>
              {Object.keys(SURVEY_FORM_CONFIGS).map((key) => (
                <option key={key} value={key}>
                  {SURVEY_FORM_CONFIGS[key as keyof typeof SURVEY_FORM_CONFIGS].shortName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status Survey</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="Diverifikasi">Diverifikasi</option>
              <option value="Terkirim">Terkirim</option>
              <option value="Perlu Perbaikan">Perlu Perbaikan</option>
              <option value="Draft">Draft</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Periode Dari</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Periode Hingga</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 4 Summary Cards Requested */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Responden"
          value={reportData.uniqueRespondents}
          subtitle="Pejabat / staf terverifikasi"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Total Data Survey"
          value={reportData.totalSubmissions}
          subtitle="Total formulir masuk"
          icon={FileSpreadsheet}
          color="purple"
        />
        <StatCard
          title="Survey Selesai"
          value={reportData.selesai}
          subtitle="Terkirim & Diverifikasi"
          icon={CheckCircle2}
          color="emerald"
          trend="85% tuntas"
          trendPositive={true}
        />
        <StatCard
          title="Survey Belum Selesai"
          value={reportData.belumSelesai}
          subtitle="Draft / Perbaikan"
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Category Breakdown Cards */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="font-bold text-slate-900 text-sm">Rekapitulasi Per Kategori Survey</h3>
          <span className="text-xs font-semibold text-slate-500">Target 5 Formulir</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {reportData.categorySummaries.map((cat) => (
            <div key={cat.key} className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                {cat.name}
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-slate-900">{cat.count} Data</span>
                <span className="text-xs font-bold text-emerald-600">{cat.verified} Disetujui</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${cat.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabel Rekapitulasi per OPD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 sm:px-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Matriks Capaian Survey Organisasi Perangkat Daerah</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rasio kepatuhan pengisian kuesioner dari target 5 bidang prioritas TUBABA.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {reportData.opdSummaries.length} Instansi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/70">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Nama OPD / Instansi</th>
                <th className="py-3.5 px-4">Kode Satker</th>
                <th className="py-3.5 px-4 text-center">Total Form</th>
                <th className="py-3.5 px-4 text-center">Diverifikasi</th>
                <th className="py-3.5 px-4 text-center">Terkirim</th>
                <th className="py-3.5 px-4 text-center">Perlu Revisi</th>
                <th className="py-3.5 px-4 text-center">Draft</th>
                <th className="py-3.5 px-4 text-center w-36">Progres Pemenuhan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {reportData.opdSummaries.map((opd, idx) => (
                <tr key={opd.opdId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{opd.opdName}</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-blue-700">{opd.opdCode}</td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                    {opd.totalSubmissions}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold">
                      {opd.diverifikasi}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold">
                      {opd.terkirim}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold">
                      {opd.perluPerbaikan}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold">
                      {opd.draft}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            opd.completionRate >= 80
                              ? 'bg-emerald-500'
                              : opd.completionRate >= 40
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${opd.completionRate}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 w-8 text-right">
                        {opd.completionRate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
