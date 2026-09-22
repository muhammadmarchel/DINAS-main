import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { surveyService } from '../../services/surveyService';
import { SURVEY_FORM_CONFIGS } from '../../data/surveyConfigs';
import { SurveySubmission } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  ArrowLeft,
  Printer,
  FileDown,
  Edit,
  CheckCircle,
  AlertCircle,
  Building,
  User,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  FileText,
  FileCode,
} from 'lucide-react';

export const SurveyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, currentUser } = useAuth();
  const toast = useToast();

  const [survey, setSurvey] = useState<SurveySubmission | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');

  const loadSurvey = async () => {
    if (id) {
      const found = surveyService.getById(id);
      if (found) setSurvey(found);

      try {
        const freshList = await surveyService.syncRemote();
        const fresh = freshList.find((s) => s.id === id);
        if (fresh) setSurvey(fresh);
      } catch (e) {
        console.warn('Sync notice:', e);
      }
    }
  };

  useEffect(() => {
    loadSurvey();
  }, [id]);

  if (!survey) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
        <h3 className="font-bold text-slate-800 text-lg">Data Survey Tidak Ditemukan</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Dokumen formulir survey dengan ID "{id}" tidak ditemukan dalam sistem.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
        >
          Kembali ke Daftar
        </button>
      </div>
    );
  }

  const formConfig = SURVEY_FORM_CONFIGS[survey.surveyCategory];

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    toast.info('Menyiapkan format dokumen cetak resmi PDF TUBABA...', 'Ekspor Berkas');
    window.print();
  };

  const handleVerify = async () => {
    await surveyService.updateStatus(
      survey.id,
      'Diverifikasi',
      'Data survey telah ditinjau dan dinyatakan lengkap dan valid.',
      currentUser?.name || 'Administrator TUBABA'
    );
    setShowVerifyModal(false);
    toast.success(`Survey ${survey.id} berhasil diverifikasi.`, 'Verifikasi Berhasil');
    loadSurvey();
  };

  const handleRequestRevision = async () => {
    if (!revisionNotes.trim()) {
      toast.warning('Harap masukkan catatan bagian mana yang perlu diperbaiki.', 'Catatan Kosong');
      return;
    }
    await surveyService.updateStatus(survey.id, 'Perlu Perbaikan', revisionNotes);
    setShowRevisionModal(false);
    toast.info(`Catatan perbaikan telah dikirim ke responden ${survey.opdName}.`, 'Revisi Dikirim');
    loadSurvey();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Admin Verification Actions */}
          {isAdmin && survey.status !== 'Diverifikasi' && (
            <button
              onClick={() => setShowVerifyModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Verifikasi Berkas</span>
            </button>
          )}

          {isAdmin && survey.status !== 'Perlu Perbaikan' && (
            <button
              onClick={() => setShowRevisionModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Minta Revisi</span>
            </button>
          )}

          <button
            onClick={() =>
              navigate(
                `/survey/form/${survey.surveyCategory.toLowerCase().replace(/_/g, '-')}?edit=${survey.id}`
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Data</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <FileDown className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Official Sheet Print Container */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-lg print:border-none print:shadow-none print:p-0 space-y-8">
        {/* Official Kop Surat (TUBABA Government Header) */}
        <div className="flex items-center gap-4 pb-6 border-b-2 border-slate-900 text-center sm:text-left">
          <img
            src="/logo-tubaba.svg"
            alt="Logo Tubaba"
            className="w-16 h-20 object-contain shrink-0 mx-auto sm:mx-0"
          />
          <div className="flex-1">
            <h4 className="text-xs font-bold tracking-widest uppercase text-slate-600">
              Pemerintah Kabupaten Tulang Bawang Barat
            </h4>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight mt-0.5">
              Lembar Rekapitulasi Data Survey Digital
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Sistem Pengumpulan dan Pengelolaan Data Survey Terpadu Antar-OPD
            </p>
          </div>
          <div className="hidden sm:block text-right">
            <span className="text-[11px] font-mono text-slate-400 block">ID Dokumen:</span>
            <span className="text-sm font-mono font-bold text-slate-800">{survey.id}</span>
          </div>
        </div>

        {/* Header Metadata Info */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Instansi / OPD</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{survey.opdName}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Nama Responden</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{survey.respondent.respondentName}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Jenis Survey</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{survey.surveyCategory}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Status & Tanggal</span>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={survey.status} size="sm" />
              <span className="text-slate-500 font-medium">
                {survey.respondent.fillDate || new Date(survey.createdAt).toLocaleDateString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Admin Notes / Revision Banner if present */}
        {survey.notesAdmin && (
          <div
            className={`p-4 rounded-2xl border text-xs leading-relaxed ${
              survey.status === 'Perlu Perbaikan'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <span className="font-bold block mb-1">
              Catatan Administrator TUBABA ({survey.verifiedBy || 'Tim Teknis'}):
            </span>
            <p>{survey.notesAdmin}</p>
          </div>
        )}

        {/* Section 1: IDENTITAS RESPONDEN */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <User className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">
              I. Identitas Responden
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-white p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-400 font-medium block">Nama Lengkap</span>
              <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                {survey.respondent.respondentName}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Jabatan / Posisi</span>
              <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                {survey.respondent.position}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Instansi / Unit Kerja</span>
              <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                {survey.respondent.agencyName}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Email & Kontak</span>
              <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                {survey.respondent.email} • {survey.respondent.phone}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: HASIL SURVEY */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">
              II. Hasil Jawaban Kuesioner Survey
            </h3>
          </div>

          <div className="space-y-4">
            {formConfig.questions.map((q, idx) => {
              const answer = survey.answers[q.id];

              return (
                <div
                  key={q.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5"
                >
                  <span className="text-xs font-bold text-slate-700 block">
                    Pertanyaan {idx + 1}: {q.label}
                  </span>

                  <div className="text-sm font-semibold text-slate-900 pt-1">
                    {answer === undefined || answer === null || answer === '' ? (
                      <span className="text-slate-400 italic font-normal">(Tidak diisi)</span>
                    ) : Array.isArray(answer) ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {answer.map((val, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium"
                          >
                            {val}
                          </span>
                        ))}
                      </div>
                    ) : q.type === 'file' ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-blue-700">
                        <FileCode className="w-4 h-4 text-blue-600" />
                        <span>{String(answer)}</span>
                      </div>
                    ) : (
                      <p className="whitespace-pre-line font-normal text-slate-800 bg-white p-3 rounded-lg border border-slate-200/70">
                        {String(answer)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Official Signatures Box for Print */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <p className="text-slate-500">Responden Pengisi Survey,</p>
            <div className="h-20" />
            <p className="font-bold text-slate-900 underline">{survey.respondent.respondentName}</p>
            <p className="text-[11px] text-slate-500">{survey.respondent.position}</p>
          </div>
          <div>
            <p className="text-slate-500">Panaragan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="text-slate-500">Mengetahui / Verifikator TUBABA,</p>
            <div className="h-16" />
            <p className="font-bold text-slate-900 underline">
              {survey.verifiedBy && !survey.verifiedBy.includes('Ahmad Syarifudin')
                ? survey.verifiedBy
                : 'Umar Ali Ahmad, Ph.D.'}
            </p>
            <p className="text-[11px] text-slate-500">Tim Tenaga Ahli / Verifikator</p>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      <Modal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        title="Verifikasi Formulir Survey"
        description="Pastikan data yang dikirimkan oleh OPD telah dicek kesesuaian dan kelengkapannya."
        confirmText="Ya, Setujui & Verifikasi"
        cancelText="Batal"
        variant="primary"
        onConfirm={handleVerify}
      >
        <p className="text-xs text-slate-600 leading-relaxed">
          Setelah diverifikasi, status formulir akan diperbarui menjadi <strong>Diverifikasi</strong> dan tercatat resmi pada rekapitulasi capaian daerah.
        </p>
      </Modal>

      {/* Revision Modal */}
      <Modal
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        title="Permintaan Perbaikan Data Survey"
        description="Tuliskan catatan teknis untuk responden OPD terkait bagian yang harus diperbaiki atau dilengkapi."
        confirmText="Kirim Catatan Revisi"
        cancelText="Batal"
        variant="warning"
        onConfirm={handleRequestRevision}
      >
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">Catatan Perbaikan:</label>
          <textarea
            rows={4}
            value={revisionNotes}
            onChange={(e) => setRevisionNotes(e.target.value)}
            placeholder="Contoh: Mohon lengkapi lampiran dokumen Renja dan pastikan nomor kontak dapat dihubungi..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </Modal>
    </div>
  );
};
