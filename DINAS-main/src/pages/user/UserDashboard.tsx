import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { surveyService } from '../../services/surveyService';
import { SURVEY_FORM_CONFIGS } from '../../data/surveyConfigs';
import { SurveySubmission } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  ArrowRight,
  Eye,
  Edit3,
  Building,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const UserDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [mySurveys, setMySurveys] = useState<SurveySubmission[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const belongsToUser = (s: SurveySubmission) =>
      s.createdByUserId === currentUser.id ||
      s.createdByUserId === currentUser.email ||
      s.respondent?.email === currentUser.email ||
      (currentUser.opdId && s.opdId === currentUser.opdId) ||
      (currentUser.opdName && s.opdName && s.opdName.toLowerCase() === currentUser.opdName.toLowerCase());

    const loadUserSurveys = () => {
      const list = surveyService.getAll().filter(belongsToUser);
      setMySurveys(list);

      surveyService.syncRemote().then((all) => {
        const fresh = all.filter(belongsToUser);
        setMySurveys(fresh);
      });
    };

    loadUserSurveys();

    const channel = supabase
      .channel('realtime-user-surveys')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' }, () => {
        loadUserSurveys();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const draftCount = mySurveys.filter((s) => s.status === 'Draft').length;
  const terkirimCount = mySurveys.filter((s) => s.status === 'Terkirim' || s.status === 'Diverifikasi').length;
  const perluPerbaikanCount = mySurveys.filter((s) => s.status === 'Perlu Perbaikan').length;

  // 5 forms available to fill
  const totalCategories = Object.keys(SURVEY_FORM_CONFIGS).length; // 5
  const harusDiisiCount = Math.max(0, totalCategories - (terkirimCount + mySurveys.filter(s => s.status === 'Diverifikasi').length));

  const categories = Object.values(SURVEY_FORM_CONFIGS);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-linear-to-r from-blue-800 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-950/10 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-700/60 border border-blue-500/40 text-blue-200 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Portal Pengisian Survey Mandiri OPD
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Selamat Datang, {currentUser?.name}
          </h2>
          <div className="flex items-center gap-2 text-blue-200 text-xs sm:text-sm mt-1.5">
            <Building className="w-4 h-4 text-blue-300 shrink-0" />
            <span className="font-medium">{currentUser?.opdName}</span>
          </div>
          <p className="text-blue-100/80 text-xs sm:text-sm mt-3 leading-relaxed">
            Silakan lengkapi formulir survey tahunan Kabupaten Tulang Bawang Barat sesuai dengan kewenangan instansi Anda. Pastikan data diisi secara akurat sebelum batas waktu evaluasi.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Link
              to="/form-survey"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
            >
              <FileText className="w-4 h-4" />
              Mulai Isi Form Survey
            </Link>
            <Link
              to="/data-survey"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/20 transition-colors"
            >
              Lihat Riwayat Survey Saya
            </Link>
          </div>
        </div>

        {/* Official seal watermark */}
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-6 pointer-events-none">
          <img src="/logo-tubaba.svg" alt="TUBABA" className="w-72 h-72 object-contain" />
        </div>
      </div>

      {/* 4 Cards Requested by user */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Survey Harus Diisi"
          value={harusDiisiCount}
          subtitle="Formulir belum diselesaikan"
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Survey Draft"
          value={draftCount}
          subtitle="Disimpan sementara di akun"
          icon={FileEdit}
          color="amber"
        />
        <StatCard
          title="Survey Terkirim"
          value={terkirimCount}
          subtitle="Terkirim & Menunggu/Diverifikasi"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Survey Perlu Perbaikan"
          value={perluPerbaikanCount}
          subtitle="Catatan revisi dari admin"
          icon={AlertCircle}
          color="rose"
        />
      </div>

      {/* Daftar Form Survey Yang Dapat Diakses User */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Daftar Form Survey Tersedia</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih formulir survey yang menjadi target pengisian OPD Anda:
            </p>
          </div>
          <Link to="/form-survey" className="text-xs text-blue-600 font-semibold hover:underline hidden sm:block">
            Buka Katalog Lengkap →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {categories.map((cfg) => {
            // Check status of this survey category for current user
            const existing = mySurveys.find((s) => s.surveyCategory === cfg.categoryKey);
            const routePath = `/survey/form/${cfg.categoryKey.toLowerCase().replace(/_/g, '-')}`;

            return (
              <div
                key={cfg.categoryKey}
                className="rounded-2xl border border-slate-200/70 p-5 bg-white hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                      {cfg.shortName}
                    </span>
                    {existing ? (
                      <StatusBadge status={existing.status} size="sm" />
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        Belum Diisi
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm mb-1.5 line-clamp-1">
                    {cfg.title}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {cfg.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">5 Tahapan Survey</span>
                  <button
                    onClick={() => {
                      if (existing && existing.status === 'Draft') {
                        navigate(`${routePath}?edit=${existing.id}`);
                      } else {
                        navigate(routePath);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                  >
                    <span>{existing?.status === 'Draft' ? 'Lanjutkan' : 'Isi Survey'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Riwayat Data Survey Saya */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 sm:px-6 flex items-center justify-between border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Riwayat Survey OPD Saya</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Status berkas survey yang telah Anda isi atau simpan sebagai draft.
            </p>
          </div>
          <Link
            to="/data-survey"
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            Lihat Semua Riwayat
          </Link>
        </div>

        {mySurveys.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">Belum ada riwayat survey</p>
            <p className="text-xs text-slate-400 mt-1">
              Silakan pilih formulir di atas untuk mulai mengisi data survey instansi Anda.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {mySurveys.map((survey) => (
                <div key={survey.id} className="p-4 space-y-2.5 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{survey.surveyTitle}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{survey.id}</p>
                    </div>
                    <StatusBadge status={survey.status} size="sm" />
                  </div>

                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Responden:</span>
                      <span className="font-medium text-slate-800">{survey.respondent.respondentName}</span>
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
                    {(survey.status === 'Draft' || survey.status === 'Perlu Perbaikan') && (
                      <button
                        onClick={() =>
                          navigate(
                            `/survey/form/${survey.surveyCategory.toLowerCase().replace(/_/g, '-')}?edit=${survey.id}`
                          )
                        }
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-xs rounded-xl transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Lanjutkan</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/70">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Jenis Survey</th>
                  <th className="py-3 px-4">Nama Responden</th>
                  <th className="py-3 px-4">Tanggal Pengisian</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {mySurveys.map((survey, index) => (
                  <tr key={survey.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400 font-medium">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{survey.surveyTitle}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{survey.id}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {survey.respondent.respondentName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {survey.respondent.fillDate || new Date(survey.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={survey.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(`/survey/detail/${survey.id}`)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Lihat Detail Survey"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* Only allow edit if draft or needs revision */}
                        {(survey.status === 'Draft' || survey.status === 'Perlu Perbaikan') && (
                          <button
                            onClick={() =>
                              navigate(
                                `/survey/form/${survey.surveyCategory.toLowerCase().replace(/_/g, '-')}?edit=${survey.id}`
                              )
                            }
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Lanjutkan / Edit Form"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      </div>
    </div>
  );
};
