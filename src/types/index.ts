export type Role = 'admin' | 'user';

export type SurveyCategoryKey = 
  | 'DISKOMINFO' 
  | 'BAPPEDA' 
  | 'BPKSDM' 
  | 'BAGIAN_ORGANISASI_DATA' 
  | 'DINAS';

export type SurveyStatus = 
  | 'Draft' 
  | 'Terkirim' 
  | 'Diverifikasi' 
  | 'Perlu Perbaikan';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: Role;
  opdId: string;
  opdName: string;
  nip?: string;
  phone?: string;
  avatarUrl?: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  password?: string;
}

export interface OPD {
  id: string;
  code: string;
  name: string;
  picName: string;
  email: string;
  phone: string;
  address?: string;
  status: 'active' | 'inactive';
  surveyCount: number;
}

export type InputFieldType = 
  | 'text' 
  | 'textarea' 
  | 'select' 
  | 'radio' 
  | 'checkbox' 
  | 'yes_no' 
  | 'number' 
  | 'date' 
  | 'file';

export interface FormQuestion {
  id: string;
  label: string;
  description?: string;
  type: InputFieldType;
  placeholder?: string;
  options?: string[]; // for select, radio, checkbox
  required: boolean;
  sectionIndex: number; // 0: Identitas, 1: Kondisi, 2: Masalah, 3: Rencana, 4: Data Pendukung
}

export interface FormSection {
  id: string;
  title: string;
  description: string;
  stepNumber: number;
}

export interface SurveyFormConfig {
  categoryKey: SurveyCategoryKey;
  title: string;
  shortName: string;
  agencyName: string;
  description: string;
  iconName: string;
  colorTheme: string;
  sections: FormSection[];
  questions: FormQuestion[];
}

export interface SurveyRespondent {
  agencyName: string;
  respondentName: string;
  position: string;
  email: string;
  phone: string;
  nip?: string;
  fillDate: string;
}

export interface SurveySubmission {
  id: string;
  surveyCategory: SurveyCategoryKey;
  surveyTitle: string;
  opdId: string;
  opdName: string;
  respondent: SurveyRespondent;
  answers: Record<string, any>; // questionId -> answer
  status: SurveyStatus;
  currentStep: number;
  submittedAt?: string;
  updatedAt: string;
  createdAt: string;
  createdByUserId: string;
  createdByName: string;
  notesAdmin?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}
