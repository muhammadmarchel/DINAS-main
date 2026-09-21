import { SurveySubmission, SurveyStatus, SurveyCategoryKey } from '../types';
import { INITIAL_SUBMISSIONS } from '../data/initialData';
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
  getAll: (): SurveySubmission[] => {
    return storage.get<SurveySubmission[]>(SUBMISSIONS_KEY, INITIAL_SUBMISSIONS);
  },

  setAll: (submissions: SurveySubmission[]): void => {
    storage.set(SUBMISSIONS_KEY, submissions);
  },

  // Sinkronisasi data remote dari Supabase database
  syncRemote: async (): Promise<SurveySubmission[]> => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Pemberitahuan sinkronisasi tabel surveys Supabase:', error.message);
        return surveyService.getAll();
      }

      if (data && Array.isArray(data)) {
        const remoteList: SurveySubmission[] = data.map((row: any) => ({
          id: String(row.id),
          surveyCategory: (row.survey_category || row.surveyCategory) as SurveyCategoryKey,
          surveyTitle: row.survey_title || row.surveyTitle || '',
          opdId: row.opd_id || row.opdId || '',
          opdName: row.opd_name || row.opdName || '',
          respondent: typeof row.respondent === 'string' ? JSON.parse(row.respondent) : (row.respondent || {}),
          answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : (row.answers || {}),
          status: (row.status || 'Terkirim') as SurveyStatus,
          currentStep: Number(row.current_step ?? row.currentStep ?? 1),
          submittedAt: row.submitted_at || row.submittedAt,
          updatedAt: row.updated_at || row.updatedAt || row.created_at || new Date().toISOString(),
          createdAt: row.created_at || row.createdAt || new Date().toISOString(),
          createdByUserId: row.created_by_user_id || row.createdByUserId || '',
          createdByName: row.created_by_name || row.createdByName || '',
          notesAdmin: row.notes_admin || row.notesAdmin || '',
          verifiedBy: row.verified_by || row.verifiedBy,
          verifiedAt: row.verified_at || row.verifiedAt,
        }));

        const existingLocal = surveyService.getAll();
        const map = new Map<string, SurveySubmission>();

        // Masukkan data lokal demo terlebih dahulu
        existingLocal.forEach((s) => map.set(s.id, s));
        // Sinkronkan data dari cloud database Supabase
        remoteList.forEach((s) => map.set(s.id, s));

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );

        surveyService.setAll(merged);
        return merged;
      }
    } catch (err) {
      console.warn('Gagal sinkronisasi data survey dari Supabase:', err);
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

  create: async (submission: Omit<SurveySubmission, 'id' | 'createdAt' | 'updatedAt'>): Promise<SurveySubmission> => {
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

    // Kirim juga ke cloud database Supabase
    try {
      const { error } = await supabase.from('surveys').insert([
        {
          id: newEntry.id,
          survey_category: newEntry.surveyCategory,
          survey_title: newEntry.surveyTitle,
          opd_id: newEntry.opdId,
          opd_name: newEntry.opdName,
          respondent: newEntry.respondent,
          answers: newEntry.answers,
          status: newEntry.status,
          current_step: newEntry.currentStep,
          submitted_at: newEntry.submittedAt || (newEntry.status === 'Terkirim' ? timestamp : null),
          created_by_user_id: newEntry.createdByUserId,
          created_by_name: newEntry.createdByName,
          notes_admin: newEntry.notesAdmin,
          created_at: newEntry.createdAt,
          updated_at: newEntry.updatedAt,
        },
      ]);

      if (error) {
        console.warn('Gagal menyimpan ke tabel Supabase surveys:', error.message);
      }
    } catch (err) {
      console.warn('Error saat mengirim survey ke Supabase:', err);
    }

    return newEntry;
  },

  update: async (id: string, updates: Partial<SurveySubmission>): Promise<SurveySubmission> => {
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

    // Update di cloud database Supabase
    try {
      const { error } = await supabase
        .from('surveys')
        .update({
          survey_category: updated.surveyCategory,
          survey_title: updated.surveyTitle,
          opd_id: updated.opdId,
          opd_name: updated.opdName,
          respondent: updated.respondent,
          answers: updated.answers,
          status: updated.status,
          current_step: updated.currentStep,
          submitted_at: updated.submittedAt,
          notes_admin: updated.notesAdmin,
          verified_by: updated.verifiedBy,
          verified_at: updated.verifiedAt,
          updated_at: updated.updatedAt,
        })
        .eq('id', id);

      if (error) {
        console.warn('Gagal update tabel Supabase surveys:', error.message);
      }
    } catch (err) {
      console.warn('Error update Supabase surveys:', err);
    }

    return updated;
  },

  delete: async (id: string): Promise<boolean> => {
    const all = surveyService.getAll();
    const filtered = all.filter((s) => s.id !== id);
    if (filtered.length === all.length) return false;

    surveyService.setAll(filtered);

    // Hapus di cloud database Supabase
    try {
      await supabase.from('surveys').delete().eq('id', id);
    } catch (err) {
      console.warn('Error delete Supabase surveys:', err);
    }

    return true;
  },

  updateStatus: async (id: string, status: SurveyStatus, notesAdmin?: string, verifiedBy?: string): Promise<SurveySubmission> => {
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
