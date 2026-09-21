import { SurveySubmission, SurveyStatus, SurveyCategoryKey } from '../types';
import { INITIAL_SUBMISSIONS } from '../data/initialData';
import { storage } from './storage';

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
  getAll: (): SurveySubmission[] => {
    return storage.get<SurveySubmission[]>(SUBMISSIONS_KEY, INITIAL_SUBMISSIONS);
  },

  setAll: (submissions: SurveySubmission[]): void => {
    storage.set(SUBMISSIONS_KEY, submissions);
  },

  getById: (id: string): SurveySubmission | undefined => {
    const all = surveyService.getAll();
    return all.find((s) => s.id === id);
  },

  filterSubmissions: (params: SurveyFilterParams): SurveySubmission[] => {
    let list = surveyService.getAll();

    if (params.userId) {
      list = list.filter((s) => s.createdByUserId === params.userId);
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

    // Sort newest first
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  create: (submission: Omit<SurveySubmission, 'id' | 'createdAt' | 'updatedAt'>): SurveySubmission => {
    const all = surveyService.getAll();
    const timestamp = new Date().toISOString();
    const nextSeq = String(all.length + 1).padStart(3, '0');
    const newId = `SRV-2026-${nextSeq}`;

    const newEntry: SurveySubmission = {
      ...submission,
      id: newId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    all.unshift(newEntry);
    surveyService.setAll(all);
    return newEntry;
  },

  update: (id: string, updates: Partial<SurveySubmission>): SurveySubmission => {
    const all = surveyService.getAll();
    const index = all.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Survey tidak ditemukan');

    const updated = {
      ...all[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    all[index] = updated;
    surveyService.setAll(all);
    return updated;
  },

  delete: (id: string): boolean => {
    const all = surveyService.getAll();
    const filtered = all.filter((s) => s.id !== id);
    if (filtered.length === all.length) return false;
    surveyService.setAll(filtered);
    return true;
  },

  updateStatus: (id: string, status: SurveyStatus, notesAdmin?: string, verifiedBy?: string): SurveySubmission => {
    return surveyService.update(id, {
      status,
      notesAdmin: notesAdmin !== undefined ? notesAdmin : undefined,
      verifiedBy: verifiedBy || undefined,
      verifiedAt: status === 'Diverifikasi' ? new Date().toISOString() : undefined,
    });
  },

  getStats: (userId?: string) => {
    const all = surveyService.getAll();
    const target = userId ? all.filter((s) => s.createdByUserId === userId) : all;

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
    const headers = ['No', 'ID Survey', 'Instansi / OPD', 'Nama Responden', 'Jabatan', 'Email', 'No Telepon', 'Kategori Survey', 'Tanggal Pengisian', 'Status', 'Dibuat Oleh'];
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

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_survey_tubaba_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
