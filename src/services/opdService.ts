import { OPD } from '../types';
import { INITIAL_OPDS } from '../data/initialData';
import { storage } from './storage';
import { surveyService } from './surveyService';

const OPDS_KEY = 'tubaba_survey_opds';

export const opdService = {
  getAll: (): OPD[] => {
    const opds = storage.get<OPD[]>(OPDS_KEY, INITIAL_OPDS);
    // Dynamically calculate actual survey counts from surveys
    const surveys = surveyService.getAll();
    return opds.map((opd) => ({
      ...opd,
      surveyCount: surveys.filter((s) => s.opdId === opd.id).length,
    }));
  },

  setAll: (opds: OPD[]): void => {
    storage.set(OPDS_KEY, opds);
  },

  getById: (id: string): OPD | undefined => {
    const all = opdService.getAll();
    return all.find((o) => o.id === id);
  },

  create: (data: Omit<OPD, 'id' | 'surveyCount'>): OPD => {
    const all = storage.get<OPD[]>(OPDS_KEY, INITIAL_OPDS);
    const newId = `opd-${Date.now()}`;
    const newOpd: OPD = {
      ...data,
      id: newId,
      surveyCount: 0,
    };
    all.push(newOpd);
    opdService.setAll(all);
    return newOpd;
  },

  update: (id: string, updates: Partial<OPD>): OPD => {
    const all = storage.get<OPD[]>(OPDS_KEY, INITIAL_OPDS);
    const index = all.findIndex((o) => o.id === id);
    if (index === -1) throw new Error('OPD tidak ditemukan');
    const updated = { ...all[index], ...updates };
    all[index] = updated;
    opdService.setAll(all);
    return updated;
  },

  delete: (id: string): boolean => {
    const all = storage.get<OPD[]>(OPDS_KEY, INITIAL_OPDS);
    const filtered = all.filter((o) => o.id !== id);
    if (filtered.length === all.length) return false;
    opdService.setAll(filtered);
    return true;
  },
};
