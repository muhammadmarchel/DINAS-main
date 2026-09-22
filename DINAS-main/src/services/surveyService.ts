import { SurveySubmission, SurveyStatus, SurveyCategoryKey } from '../types';
import { storage } from './storage';
import { supabase } from '../lib/supabase';

const SUBMISSIONS_KEY = 'tubaba_survey_submissions';

export interface SurveyFilterParams {
  search?: string;
  opdId?: string;
  category?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export const surveyService = {
  // Ambil data lokal (default array kosong, bukan mock)
  getAll: (): SurveySubmission[] => {
    return storage.get<SurveySubmission[]>(SUBMISSIONS_KEY, []);
  },

  setAll: (submissions: SurveySubmission[]): void => {
    storage.set(SUBMISSIONS_KEY, submissions);
  },

  // Helper untuk memformat data dari tabel Supabase surveys
  formatRemoteSurveys: (rows: any[]): SurveySubmission[] => {
    if (!rows || !Array.isArray(rows)) return [];

    return rows.map((row: any) => {
      const ansObj =
        typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers || {};

      // Respondent data
      const respondent = ansObj.respondent || {
        agencyName: row.opd_name || ansObj.opdName || 'OPD',
        respondentName:
          ansObj.createdByName ||
          (row.user_email ? row.user_email.split('@')[0] : 'Pegawai OPD'),
        position: ansObj.position || 'Staf OPD',
        email: row.user_email || ansObj.email || '',
        phone: ansObj.phone || '',
        fillDate: (row.created_at || new Date().toISOString()).split('T')[0],
      };

      // Survey Category & Title
      const surveyCategory: SurveyCategoryKey =
        ansObj.surveyCategory || ansObj.categoryKey || 'DISKOMINFO';
      const surveyTitle =
        ansObj.surveyTitle || `Survei Kebutuhan SPBE - ${row.opd_name || 'OPD'}`;

      // Actual question answers
      const actualAnswers = ansObj.answers !== undefined ? ansObj.answers : ansObj;

      // Status mapping ('submitted' -> 'Terkirim', 'draft' -> 'Draft', dll)
      let status: SurveyStatus = 'Terkirim';
      const rawStatus = String(row.status || '').trim().toLowerCase();
      if (rawStatus === 'draft') {
        status = 'Draft';
      } else if (
        rawStatus === 'diverifikasi' ||
        rawStatus === 'verified' ||
        rawStatus === 'approved'
      ) {
        status = 'Diverifikasi';
      } else if (
        rawStatus === 'perlu perbaikan' ||
        rawStatus === 'revision' ||
        rawStatus === 'perbaikan'
      ) {
        status = 'Perlu Perbaikan';
      } else {
        status = 'Terkirim';
      }

      return {
        id: String(row.id),
        surveyCategory,
        surveyTitle,
        opdId:
          ansObj.opdId ||
          (row.opd_name ? row.opd_name.toLowerCase().replace(/\s+/g, '-') : 'opd-umum'),
        opdName: row.opd_name || ansObj.opdName || respondent.agencyName || 'OPD',
        respondent,
        answers: actualAnswers,
        status,
        currentStep: Number(ansObj.currentStep || 5),
        submittedAt: row.created_at || ansObj.submittedAt,
        updatedAt: row.created_at || ansObj.updatedAt || new Date().toISOString(),
        createdAt: row.created_at || ansObj.createdAt || new Date().toISOString(),
        createdByUserId: row.user_email || ansObj.createdByUserId || '',
        createdByName: respondent.respondentName || row.user_email || '',
        notesAdmin: ansObj.notesAdmin || '',
        verifiedBy: ansObj.verifiedBy,
        verifiedAt: ansObj.verifiedAt,
      };
    });
  },

  // Sinkronisasi data remote langsung dari Supabase database
  syncRemote: async (): Promise<SurveySubmission[]> => {
    try {
      const { data: surveyList, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Gagal sinkronisasi data dari tabel surveys Supabase:', error.message);
        return surveyService.getAll();
      }

      if (surveyList && Array.isArray(surveyList)) {
        // Tampilkan murni data dari surveyList database Supabase (bukan mock)
        const formatted = surveyService.formatRemoteSurveys(surveyList);
        surveyService.setAll(formatted);
        return formatted;
      }
    } catch (err) {
      console.warn('Gagal terhubung ke database surveys Supabase:', err);
    }
    return surveyService.getAll();
  },

  getById: (id: string): SurveySubmission | undefined => {
    const all = surveyService.getAll();
    return all.find((s) => s.id === id);
  },

  filterSubmissions: (params: SurveyFilterParams): SurveySubmission[] => {
    let list = surveyService.getAll();

    if (params.userId) {
      list = list.filter(
        (s) =>
          s.createdByUserId === params.userId ||
          s.respondent.email === params.userId
      );
    }

    if (params.opdId && params.opdId !== 'all') {
      list = list.filter((s) => s.opdId === params.opdId);
    }

    if (params.category && params.category !== 'all') {
      list = list.filter((s) => s.surveyCategory === params.category);
    }

    if (params.status && params.status !== 'all') {
      list = list.filter((s) => s.status === params.status);
    }

    if (params.startDate) {
      list = list.filter((s) => s.createdAt >= params.startDate!);
    }

    if (params.endDate) {
      list = list.filter((s) => s.createdAt <= `${params.endDate}T23:59:59Z`);
    }

    if (params.search && params.search.trim() !== '') {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.opdName.toLowerCase().includes(q) ||
          s.respondent.respondentName.toLowerCase().includes(q) ||
          s.surveyTitle.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
      );
    }

    // Urutkan yang terbaru terlebih dahulu
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  create: async (
    submission: Omit<SurveySubmission, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SurveySubmission> => {
    const userEmail = submission.createdByUserId?.includes('@')
      ? submission.createdByUserId
      : submission.respondent?.email || '';
    const opdName = submission.opdName || submission.respondent?.agencyName || '';

    const formData = {
      surveyCategory: submission.surveyCategory,
      categoryKey: submission.surveyCategory,
      surveyTitle: submission.surveyTitle,
      opdId: submission.opdId,
      opdName: opdName,
      respondent: submission.respondent,
      answers: submission.answers,
      currentStep: submission.currentStep,
      submittedAt: submission.submittedAt || new Date().toISOString(),
      createdByUserId: submission.createdByUserId,
      createdByName: submission.createdByName,
      notesAdmin: submission.notesAdmin || '',
    };

    const dbStatus = submission.status === 'Draft' ? 'draft' : 'submitted';

    try {
      const { data, error } = await supabase
        .from('surveys')
        .insert([
          {
            user_email: userEmail,
            opd_name: opdName,
            answers: formData,
            status: dbStatus,
          },
        ])
        .select();

      if (error) {
        console.error('Error insert survey ke Supabase:', error.message);
        throw error;
      }

      if (data && data.length > 0) {
        const created = surveyService.formatRemoteSurveys(data)[0];
        const all = surveyService.getAll();
        all.unshift(created);
        surveyService.setAll(all);
        return created;
      }
    } catch (err) {
      console.warn('Fallback error saat create survey:', err);
    }

    // Local fallback jika jaringan offline
    const fallbackId = `temp-${Date.now()}`;
    const newEntry: SurveySubmission = {
      ...submission,
      id: fallbackId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const all = surveyService.getAll();
    all.unshift(newEntry);
    surveyService.setAll(all);
    return newEntry;
  },

  update: async (
    id: string,
    updates: Partial<SurveySubmission>
  ): Promise<SurveySubmission> => {
    const all = surveyService.getAll();
    const index = all.findIndex((s) => s.id === id);
    const existing = index !== -1 ? all[index] : ({} as SurveySubmission);

    const updated: SurveySubmission = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (index !== -1) {
      all[index] = updated;
      surveyService.setAll(all);
    }

    const numericId = parseInt(String(id).replace(/\D/g, ''), 10);
    const formData = {
      surveyCategory: updated.surveyCategory,
      categoryKey: updated.surveyCategory,
      surveyTitle: updated.surveyTitle,
      opdId: updated.opdId,
      opdName: updated.opdName,
      respondent: updated.respondent,
      answers: updated.answers,
      currentStep: updated.currentStep,
      submittedAt: updated.submittedAt,
      createdByUserId: updated.createdByUserId,
      createdByName: updated.createdByName,
      notesAdmin: updated.notesAdmin || '',
      verifiedBy: updated.verifiedBy,
      verifiedAt: updated.verifiedAt,
    };

    let dbStatus = 'submitted';
    if (updated.status === 'Draft') dbStatus = 'draft';
    else if (updated.status === 'Diverifikasi') dbStatus = 'verified';
    else if (updated.status === 'Perlu Perbaikan') dbStatus = 'revision';

    if (!isNaN(numericId)) {
      try {
        await supabase
          .from('surveys')
          .update({
            opd_name: updated.opdName,
            answers: formData,
            status: dbStatus,
          })
          .eq('id', numericId);
      } catch (err) {
        console.warn('Gagal update survey di Supabase:', err);
      }
    }

    return updated;
  },

  delete: async (id: string): Promise<boolean> => {
    const numericId = parseInt(String(id).replace(/\D/g, ''), 10);
    if (!isNaN(numericId)) {
      try {
        await supabase.from('surveys').delete().eq('id', numericId);
      } catch (err) {
        console.warn('Gagal delete survey di Supabase:', err);
      }
    }

    const all = surveyService.getAll();
    const filtered = all.filter((s) => s.id !== id);
    if (filtered.length === all.length) return false;
    surveyService.setAll(filtered);
    return true;
  },

  updateStatus: async (
    id: string,
    status: SurveyStatus,
    notesAdmin?: string,
    verifiedBy?: string
  ): Promise<SurveySubmission> => {
    const all = surveyService.getAll();
    const found = all.find((s) => s.id === id);
    const currentNotes = notesAdmin !== undefined ? notesAdmin : found?.notesAdmin;
    const currentVerifier = verifiedBy || found?.verifiedBy;
    const verifiedAt = status === 'Diverifikasi' ? new Date().toISOString() : found?.verifiedAt;

    return await surveyService.update(id, {
      status,
      notesAdmin: currentNotes,
      verifiedBy: currentVerifier,
      verifiedAt,
    });
  },

  getStats: (userId?: string) => {
    const all = surveyService.getAll();
    const target = userId
      ? all.filter((s) => s.createdByUserId === userId || s.respondent.email === userId)
      : all;

    const total = target.length;
    const diverifikasi = target.filter((s) => s.status === 'Diverifikasi').length;
    const terkirim = target.filter((s) => s.status === 'Terkirim').length;
    const draft = target.filter((s) => s.status === 'Draft').length;
    const perluPerbaikan = target.filter((s) => s.status === 'Perlu Perbaikan').length;
    const sudahDiisi = diverifikasi + terkirim;

    return {
      total,
      sudahDiisi,
      belumDiisi: draft,
      diverifikasi,
      terkirim,
      draft,
      perluPerbaikan,
    };
  },

  exportToCSV: (submissions: SurveySubmission[]): void => {
    const headers = [
      'No',
      'ID Survey',
      'Instansi / OPD',
      'Nama Responden',
      'Jabatan',
      'Email',
      'No Telepon',
      'Kategori Survey',
      'Tanggal Pengisian',
      'Status',
      'Dibuat Oleh',
    ];
    const rows = submissions.map((s, idx) => [
      idx + 1,
      `"${s.id}"`,
      `"${s.opdName.replace(/"/g, '""')}"`,
      `"${s.respondent.respondentName.replace(/"/g, '""')}"`,
      `"${s.respondent.position.replace(/"/g, '""')}"`,
      `"${s.respondent.email}"`,
      `"${s.respondent.phone}"`,
      `"${s.surveyCategory}"`,
      `"${s.respondent.fillDate}"`,
      `"${s.status}"`,
      `"${s.createdByName.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `rekap_survey_tubaba_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
