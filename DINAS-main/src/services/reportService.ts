import { surveyService } from './surveyService';
import { opdService } from './opdService';
import { SURVEY_FORM_CONFIGS } from '../data/surveyConfigs';

export interface ReportFilter {
  opdId?: string;
  category?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface OpdReportSummary {
  opdId: string;
  opdCode: string;
  opdName: string;
  totalSubmissions: number;
  diverifikasi: number;
  terkirim: number;
  perluPerbaikan: number;
  draft: number;
  completionRate: number; // percentage
}

export const reportService = {
  getFilteredReport: (filter: ReportFilter) => {
    const allSurveys = surveyService.filterSubmissions({
      opdId: filter.opdId,
      category: filter.category,
      status: filter.status,
      startDate: filter.startDate,
      endDate: filter.endDate,
    });

    const totalSubmissions = allSurveys.length;
    // Distinct respondents by email or name
    const uniqueRespondents = new Set(allSurveys.map((s) => s.respondent.email || s.respondent.respondentName)).size;
    const selesai = allSurveys.filter((s) => s.status === 'Diverifikasi' || s.status === 'Terkirim').length;
    const belumSelesai = allSurveys.filter((s) => s.status === 'Draft' || s.status === 'Perlu Perbaikan').length;

    // Breakdown per OPD
    const allOpds = opdService.getAll();
    const opdSummaries: OpdReportSummary[] = allOpds.map((opd) => {
      const opdSurveys = allSurveys.filter((s) => s.opdId === opd.id);
      const total = opdSurveys.length;
      const diverifikasi = opdSurveys.filter((s) => s.status === 'Diverifikasi').length;
      const terkirim = opdSurveys.filter((s) => s.status === 'Terkirim').length;
      const perluPerbaikan = opdSurveys.filter((s) => s.status === 'Perlu Perbaikan').length;
      const draft = opdSurveys.filter((s) => s.status === 'Draft').length;

      // Completion rate considers submitted & verified vs expected surveys (5 forms)
      const completionRate = Math.min(100, Math.round(((diverifikasi + terkirim) / 5) * 100));

      return {
        opdId: opd.id,
        opdCode: opd.code,
        opdName: opd.name,
        totalSubmissions: total,
        diverifikasi,
        terkirim,
        perluPerbaikan,
        draft,
        completionRate,
      };
    });

    // Breakdown per Category
    const categorySummaries = Object.keys(SURVEY_FORM_CONFIGS).map((key) => {
      const config = SURVEY_FORM_CONFIGS[key as keyof typeof SURVEY_FORM_CONFIGS];
      const count = allSurveys.filter((s) => s.surveyCategory === key).length;
      const verified = allSurveys.filter((s) => s.surveyCategory === key && s.status === 'Diverifikasi').length;
      return {
        key,
        name: config.shortName,
        title: config.title,
        color: config.colorTheme,
        count,
        verified,
        percentage: totalSubmissions > 0 ? Math.round((count / totalSubmissions) * 100) : 0,
      };
    });

    return {
      totalSubmissions,
      uniqueRespondents,
      selesai,
      belumSelesai,
      opdSummaries,
      categorySummaries,
      rawSurveys: allSurveys,
    };
  },
};
