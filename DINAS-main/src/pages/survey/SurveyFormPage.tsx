import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { SURVEY_FORM_CONFIGS } from '../../data/surveyConfigs';
import { surveyService } from '../../services/surveyService';
import { opdService } from '../../services/opdService';
import { SurveyCategoryKey, SurveyRespondent, OPD } from '../../types';
import { Modal } from '../../components/common/Modal';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  Upload,
  CheckCircle,
  AlertCircle,
  Building,
  User,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  ArrowLeft,
  FileCheck,
} from 'lucide-react';

export const SurveyFormPage: React.FC = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const editId = searchParams.get('edit');

  const { currentUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const resolveCategoryKey = (): SurveyCategoryKey => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/diskominfo')) return 'DISKOMINFO';
    if (path.includes('/bappeda')) return 'BAPPEDA';
    if (path.includes('/bpksdm')) return 'BPKSDM';
    if (path.includes('/organisasi')) return 'BAGIAN_ORGANISASI_DATA';
    if (path.includes('/dinas')) return 'DINAS';

    if (categorySlug) {
      const clean = categorySlug.toUpperCase();
      if (clean.includes('KOMINFO') || clean.includes('DISKOMINFO')) return 'DISKOMINFO';
      if (clean.includes('BAPPEDA')) return 'BAPPEDA';
      if (clean.includes('BPKSDM') || clean.includes('KEPEGAWAIAN')) return 'BPKSDM';
      if (clean.includes('ORGANISASI')) return 'BAGIAN_ORGANISASI_DATA';
      return 'DINAS';
    }

    if (currentUser?.opdName) {
      const clean = currentUser.opdName.toUpperCase();
      if (clean.includes('KOMINFO') || clean.includes('DISKOMINFO')) return 'DISKOMINFO';
      if (clean.includes('BAPPEDA')) return 'BAPPEDA';
      if (clean.includes('KEPEGAWAIAN') || clean.includes('BKPSDM') || clean.includes('BPKSDM')) return 'BPKSDM';
      if (clean.includes('ORGANISASI')) return 'BAGIAN_ORGANISASI_DATA';
    }

    return 'DISKOMINFO';
  };

  const categoryKey = resolveCategoryKey();
  const formConfig = SURVEY_FORM_CONFIGS[categoryKey];

  const [respondent, setRespondent] = useState<SurveyRespondent>({
    agencyName: formConfig.agencyName,
    respondentName: currentUser?.name || '',
    position: 'Kepala Seksi / Staf Teknis',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    fillDate: new Date().toISOString().slice(0, 10),
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [opds, setOpds] = useState<OPD[]>([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bagian B: Survey Answers (questionId -> value)
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [attachedFiles, setAttachedFiles] = useState<Record<string, string>>({});

  useEffect(() => {
    const listOpd = opdService.getAll();
    setOpds(listOpd);

    // If editing existing submission
    if (editId) {
      const existing = surveyService.getById(editId);
      if (existing) {
        setRespondent(existing.respondent);
        setAnswers(existing.answers || {});
        setCurrentStep(existing.currentStep || 1);
      }
    } else {
      setRespondent((prev) => ({
        ...prev,
        agencyName: formConfig.agencyName,
        respondentName: currentUser?.name || prev.respondentName,
        email: currentUser?.email || prev.email,
        phone: currentUser?.phone || prev.phone,
      }));
    }
  }, [editId, currentUser, formConfig.agencyName]);

  const handleRespondentChange = (field: keyof SurveyRespondent, value: string) => {
    setRespondent((prev) => ({ ...prev, [field]: value }));
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleCheckboxToggle = (questionId: string, option: string) => {
    const currentList: string[] = answers[questionId] || [];
    const exists = currentList.includes(option);
    const updated = exists
      ? currentList.filter((item) => item !== option)
      : [...currentList, option];
    setAnswers((prev) => ({ ...prev, [questionId]: updated }));
  };

  const handleFileUpload = (questionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileNames = Array.from(files).map((f) => f.name).join(', ');
      setAttachedFiles((prev) => ({ ...prev, [questionId]: fileNames }));
      setAnswers((prev) => ({ ...prev, [questionId]: fileNames }));
      toast.success(`${files.length} berkas siap dilampirkan.`, 'Unggah Berkas');
    }
  };

  // Step validation
  const validateCurrentStep = (): boolean => {
    if (currentStep === 1) {
      if (!respondent.respondentName.trim() || !respondent.position.trim() || !respondent.email.trim()) {
        toast.warning('Harap lengkapi seluruh kolom identitas responden yang wajib diisi.', 'Form Belum Lengkap');
        return false;
      }
      return true;
    }

    // Question validation for step 2, 3, 4, 5
    const stepQuestions = formConfig.questions.filter((q) => q.sectionIndex === currentStep - 1);
    const missing = stepQuestions.filter((q) => {
      if (!q.required) return false;
      const ans = answers[q.id];
      if (ans === undefined || ans === null || ans === '') return true;
      if (Array.isArray(ans) && ans.length === 0) return true;
      return false;
    });

    if (missing.length > 0) {
      toast.warning('Harap lengkapi seluruh pertanyaan yang wajib diisi pada langkah ini.', 'Pertanyaan Wajib Belum Diisi');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, formConfig.sections.length));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveDraft = () => {
    try {
      const selectedOpd = opds.find((o) => o.name === respondent.agencyName) || opds[0];

      if (editId) {
        surveyService.update(editId, {
          respondent,
          answers,
          status: 'Draft',
          currentStep,
        });
      } else {
        surveyService.create({
          surveyCategory: categoryKey,
          surveyTitle: formConfig.title,
          opdId: selectedOpd?.id || 'opd-umum',
          opdName: respondent.agencyName,
          respondent,
          answers,
          status: 'Draft',
          currentStep,
          createdByUserId: currentUser?.id || 'guest',
          createdByName: currentUser?.name || respondent.respondentName,
          notesAdmin: 'Draft tersimpan oleh pengguna',
        });
      }

      toast.success('Data survey berhasil disimpan sebagai draft.', 'Draft Disimpan');
    } catch (e) {
      toast.error('Gagal menyimpan draft survey.', 'Error');
    }
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    await new Promise((res) => setTimeout(res, 600));

    try {
      const selectedOpd = opds.find((o) => o.name === respondent.agencyName) || opds[0];

      if (editId) {
        surveyService.update(editId, {
          respondent,
          answers,
          status: 'Terkirim',
          currentStep: formConfig.sections.length,
          submittedAt: new Date().toISOString(),
        });
      } else {
        surveyService.create({
          surveyCategory: categoryKey,
          surveyTitle: formConfig.title,
          opdId: selectedOpd?.id || 'opd-umum',
          opdName: respondent.agencyName,
          respondent,
          answers,
          status: 'Terkirim',
          currentStep: formConfig.sections.length,
          submittedAt: new Date().toISOString(),
          createdByUserId: currentUser?.id || 'guest',
          createdByName: currentUser?.name || respondent.respondentName,
          notesAdmin: 'Data terkirim, menunggu verifikasi Admin.',
        });
      }

      setIsSubmitting(false);
      setShowSubmitModal(false);
      toast.success('Data survey berhasil dikirim ke sistem.', 'Survey Terkirim');
      navigate('/data-survey');
    } catch (e) {
      setIsSubmitting(false);
      toast.error('Gagal mengirimkan survey. Silakan coba kembali.', 'Terjadi Kesalahan');
    }
  };

  const steps = formConfig.sections.map((sec, idx) => ({
    num: idx + 1,
    label: sec.title.split(':')[0], // just taking the aspect number for label
  }));

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top back navigation and title header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/form-survey')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Katalog Form</span>
        </button>

        <span className="text-xs font-bold px-3 py-1 bg-blue-100/70 text-blue-800 rounded-full border border-blue-200/70">
          Kategori: {formConfig.shortName}
        </span>
      </div>

      {/* Title & Official Subtitle Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 shrink-0 hidden sm:block">
            <Building className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {formConfig.title}
            </h2>
            <p className="text-xs font-semibold text-blue-800 mt-1 uppercase tracking-wider">
              {formConfig.agencyName}
            </p>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              {formConfig.description}
            </p>
          </div>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Tahapan Pengisian Formulir:
          </span>
          <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            Langkah {currentStep} dari {steps.length} ({Math.round((currentStep / steps.length) * 100)}%)
          </span>
        </div>

        {/* Bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-linear-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>

        {/* Mobile Stepper View (< sm) */}
        <div className="sm:hidden flex items-center justify-between bg-blue-50/80 p-3 rounded-xl border border-blue-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {currentStep}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">Tahap Aktif</p>
              <p className="text-xs font-bold text-slate-800 truncate">{steps[currentStep - 1]?.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {steps.map((st) => (
              <button
                key={st.num}
                type="button"
                onClick={() => {
                  if (st.num < currentStep) setCurrentStep(st.num);
                }}
                className={`h-2 rounded-full transition-all ${
                  st.num === currentStep
                    ? 'bg-blue-600 w-5'
                    : st.num < currentStep
                    ? 'bg-emerald-500 w-2'
                    : 'bg-slate-300 w-2'
                }`}
                title={st.label}
              />
            ))}
          </div>
        </div>

        {/* Desktop/Tablet Step circles (>= sm) */}
        <div className="hidden sm:grid gap-1 text-center" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((st) => {
            const isDone = currentStep > st.num;
            const isCurrent = currentStep === st.num;

            return (
              <div
                key={st.num}
                onClick={() => {
                  if (st.num < currentStep) setCurrentStep(st.num);
                }}
                className={`flex flex-col items-center cursor-pointer transition-all ${
                  isCurrent ? 'scale-105' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {isDone ? <CheckCircle className="w-4 h-4" /> : st.num}
                </div>
                <span className={`text-[10px] sm:text-xs mt-1.5 font-medium line-clamp-1 ${
                  isCurrent ? 'text-blue-700 font-bold' : 'text-slate-500'
                }`}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content Body */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        {/* STEP 1: Identitas Responden */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Bagian A: Identitas Responden</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pastikan data instansi dan identitas pejabat pengisi survey terisi dengan lengkap dan valid.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nama Responden <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={respondent.respondentName}
                    onChange={(e) => handleRespondentChange('respondentName', e.target.value)}
                    placeholder="Nama lengkap beserta gelar..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Jabatan / Posisi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={respondent.position}
                  onChange={(e) => handleRespondentChange('position', e.target.value)}
                  placeholder="Contoh: Kepala Bidang / Kasubbag / Pranata Komputer"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Alamat Email Resmi <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={respondent.email}
                    onChange={(e) => handleRespondentChange('email', e.target.value)}
                    placeholder="nama@tubaba.go.id"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nomor Telepon / WhatsApp <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={respondent.phone}
                    onChange={(e) => handleRespondentChange('phone', e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tanggal Pengisian
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={respondent.fillDate}
                    onChange={(e) => handleRespondentChange('fillDate', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2, 3, 4, 5: Dynamic Questions */}
        {currentStep > 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Langkah {currentStep} dari {steps.length}
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                {formConfig.sections[currentStep - 1]?.title || 'Pertanyaan Kuesioner'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {formConfig.sections[currentStep - 1]?.description || 'Jawab pertanyaan di bawah ini sesuai fakta di OPD Anda.'}
              </p>
            </div>

            <div className="space-y-6">
              {formConfig.questions
                .filter((q) => q.sectionIndex === currentStep - 1)
                .map((q, idx) => {
                  const val = answers[q.id];

                  return (
                    <div key={q.id} className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <label className="text-sm font-bold text-slate-900 leading-snug">
                          {idx + 1}. {q.label}{' '}
                          {q.required && <span className="text-rose-500">*</span>}
                        </label>
                      </div>
                      {q.description && (
                        <p className="text-xs text-slate-500 font-normal leading-relaxed">
                          {q.description}
                        </p>
                      )}

                      {/* Render input based on q.type */}
                      {q.type === 'text' && (
                        <input
                          type="text"
                          value={val || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          placeholder={q.placeholder || 'Ketikkan jawaban Anda...'}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}

                      {q.type === 'textarea' && (
                        <textarea
                          rows={3}
                          value={val || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          placeholder={q.placeholder || 'Ketikkan rincian penjelasan...'}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}

                      {q.type === 'number' && (
                        <input
                          type="number"
                          value={val || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          placeholder={q.placeholder || '0'}
                          className="w-full max-w-xs px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}

                      {q.type === 'date' && (
                        <input
                          type="date"
                          value={val || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="w-full max-w-xs px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}

                      {q.type === 'select' && (
                        <select
                          value={val || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Pilih salah satu opsi --</option>
                          {q.options?.map((opt, i) => (
                            <option key={i} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {q.type === 'radio' && (
                        <div className="space-y-2 pt-1">
                          {q.options?.map((opt, i) => (
                            <label
                              key={i}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                val === opt
                                  ? 'bg-blue-50/90 border-blue-300 text-blue-900 font-semibold'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={opt}
                                checked={val === opt}
                                onChange={() => handleAnswerChange(q.id, opt)}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs sm:text-sm">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === 'yes_no' && (
                        <div className="grid grid-cols-2 gap-3 max-w-sm pt-1">
                          {['Ya', 'Tidak'].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleAnswerChange(q.id, opt)}
                              className={`py-2.5 px-4 rounded-xl border text-sm font-bold transition-all ${
                                val === opt
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {q.type === 'checkbox' && (
                        <div className="space-y-2 pt-1">
                          {q.options?.map((opt, i) => {
                            const isChecked = Array.isArray(val) && val.includes(opt);
                            return (
                              <label
                                key={i}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-blue-50/90 border-blue-300 text-blue-900 font-medium'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleCheckboxToggle(q.id, opt)}
                                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                />
                                <span className="text-xs sm:text-sm">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {q.type === 'file' && (
                        <div className="pt-1">
                          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-2xl bg-white hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer">
                            <Upload className="w-8 h-8 text-blue-600 mb-2" />
                            <span className="text-xs font-bold text-slate-800">
                              {attachedFiles[q.id] || val || 'Klik untuk mengunggah dokumen pendukung'}
                            </span>
                            <span className="text-[11px] text-slate-400 mt-1">
                              Format file yang didukung: PDF, Excel (XLSX), Word (DOCX). Maksimal 5MB.
                            </span>
                            <input
                              type="file"
                              multiple
                              className="hidden"
                              onChange={(e) => handleFileUpload(q.id, e)}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Action Controls: Sebelumnya, Selanjutnya, Simpan Draft, Kirim Survey */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 mt-8 border-t border-slate-100">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveDraft}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition-colors"
            >
              <Save className="w-4 h-4 text-amber-600" />
              <span>Simpan Draft</span>
            </button>
          </div>

          <div className="w-full sm:w-auto">
            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-colors"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (validateCurrentStep()) {
                    setShowSubmitModal(true);
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-md shadow-emerald-500/25 transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Survey</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog Before Submit */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Apakah Anda yakin ingin mengirim data survey?"
        description="Data yang telah dikirim akan masuk ke sistem dan dapat ditinjau oleh admin."
        confirmText="Ya, Kirim Sekarang"
        cancelText="Periksa Kembali"
        variant="primary"
        isLoading={isSubmitting}
        onConfirm={handleConfirmSubmit}
      >
        <div className="space-y-3 text-xs text-slate-600">
          <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2.5">
            <FileCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">{formConfig.title}</p>
              <p className="text-slate-600 mt-0.5">Responden: {respondent.respondentName} ({respondent.agencyName})</p>
            </div>
          </div>
          <p className="leading-relaxed">
            Setelah dikirim, status formulir akan berubah menjadi <strong className="text-blue-700">Terkirim</strong> dan siap diverifikasi oleh Tim Teknis Pemerintah Kabupaten Tulang Bawang Barat.
          </p>
        </div>
      </Modal>
    </div>
  );
};
