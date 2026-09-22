import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { SURVEY_FORM_CONFIGS } from '../../data/surveyConfigs';
import { surveyService } from '../../services/surveyService';
import { SurveyCategoryKey } from '../../types';
import {
  Server,
  LineChart,
  GraduationCap,
  Building2,
  FolderKanban,
  FilePlus2,
  Database,
  CheckCircle,
  HelpCircle,
  Sparkles,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export const SurveyCatalog: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const toast = useToast();
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});

  const isProfileIncomplete = !isAdmin && (!currentUser?.opdName || !currentUser?.opdName.trim());

  useEffect(() => {
    const all = surveyService.getAll();
    const counts: Record<string, number> = {};
    Object.keys(SURVEY_FORM_CONFIGS).forEach((key) => {
      counts[key] = all.filter((s) => s.surveyCategory === key).length;
    });
    setSubmissionCounts(counts);
  }, []);

  const handleStartSurvey = (slug: string) => {
    if (isProfileIncomplete) {
      toast.warning(
        'Harap lengkapi biodata dan asal instansi OPD Anda terlebih dahulu sebelum mengisi survey.',
        'Lengkapi Profil'
      );
      navigate('/profile?onboarding=true');
      return;
    }
    navigate(`/survey/form/${slug}`);
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Server':
        return <Server className="w-8 h-8 text-blue-600" />;
      case 'LineChart':
        return <LineChart className="w-8 h-8 text-emerald-600" />;
      case 'GraduationCap':
        return <GraduationCap className="w-8 h-8 text-amber-600" />;
      case 'Building2':
        return <Building2 className="w-8 h-8 text-purple-600" />;
      case 'FolderKanban':
      default:
        return <FolderKanban className="w-8 h-8 text-cyan-600" />;
    }
  };

  const getBorderTheme = (key: string) => {
    switch (key) {
      case 'DISKOMINFO':
        return 'hover:border-blue-400 focus-within:ring-blue-200';
      case 'BAPPEDA':
        return 'hover:border-emerald-400 focus-within:ring-emerald-200';
      case 'BPKSDM':
        return 'hover:border-amber-400 focus-within:ring-amber-200';
      case 'BAGIAN_ORGANISASI_DATA':
        return 'hover:border-purple-400 focus-within:ring-purple-200';
      case 'DINAS':
      default:
        return 'hover:border-cyan-400 focus-within:ring-cyan-200';
    }
  };

  const getSlug = (key: SurveyCategoryKey) => {
    return key.toLowerCase().replace(/_/g, '-');
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Katalog 5 Kategori Utama Survey TUBABA
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Formulir Survey Digital
            </h2>
            <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
              Pilih salah satu dari 5 kategori instansi pembina di bawah ini untuk mengisi kuesioner atau meninjau seluruh arsip data survey yang telah masuk.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 self-start md:self-auto">
            <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="text-xs text-slate-600">
              <span className="font-semibold text-slate-900 block">Sistem Multi-Step</span>
              Tersedia fitur simpan draft di setiap tahapan pengisian.
            </div>
          </div>
        </div>
      </div>

      {/* Incomplete profile warning banner */}
      {isProfileIncomplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5 text-amber-700 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                Biodata & Instansi Terdaftar Belum Lengkap
              </h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Anda wajib memilih <strong>Instansi Terdaftar (OPD)</strong> dan melengkapi profil Anda terlebih dahulu sebelum dapat mengisi formulir survey.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/profile?onboarding=true')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0 self-start sm:self-auto shadow-xs"
          >
            <span>Lengkapi Profil Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5 Big Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.values(SURVEY_FORM_CONFIGS).map((config) => {
          const count = submissionCounts[config.categoryKey] || 0;
          const slug = getSlug(config.categoryKey);

          return (
            <div
              key={config.categoryKey}
              className={`bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:-translate-y-1 ${getBorderTheme(
                config.categoryKey
              )}`}
            >
              <div>
                {/* Top icon and count badge */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 shadow-xs">
                    {getIcon(config.iconName)}
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      <Database className="w-3 h-3 text-slate-500" />
                      {count} Data Masuk
                    </span>
                  </div>
                </div>

                {/* Agency name and title */}
                <div className="space-y-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-700">
                    {config.shortName}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {config.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    Pembina: {config.agencyName}
                  </p>
                </div>

                {/* Description */}
                <p className="mt-3.5 text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  {config.description}
                </p>

                {/* Steps count pill */}
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{config.sections.length} Tahapan Terstruktur ({config.sections.length - 1} Aspek Kuesioner)</span>
                </div>
              </div>

              {/* Action Buttons: Isi Survey & Lihat Data */}
              <div className="grid grid-cols-2 gap-2.5 mt-6 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleStartSurvey(slug)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-colors"
                >
                  <FilePlus2 className="w-4 h-4" />
                  <span>Isi Survey</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/data-survey?category=${config.categoryKey}`)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  <Database className="w-4 h-4 text-slate-500" />
                  <span>Lihat Data</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
