import React from 'react';
import { SurveyStatus } from '../../types';
import { CheckCircle2, Clock, AlertCircle, FileEdit } from 'lucide-react';

interface StatusBadgeProps {
  status: SurveyStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const isSm = size === 'sm';
  const textClass = isSm ? 'text-xs px-2.5 py-0.5' : 'text-xs px-3 py-1 font-medium';
  const iconSize = isSm ? 'w-3 h-3' : 'w-3.5 h-3.5';

  switch (status) {
    case 'Diverifikasi':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${textClass}`}>
          <CheckCircle2 className={`${iconSize} text-emerald-600`} />
          <span>Diverifikasi</span>
        </span>
      );
    case 'Terkirim':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 ${textClass}`}>
          <Clock className={`${iconSize} text-blue-600`} />
          <span>Terkirim</span>
        </span>
      );
    case 'Perlu Perbaikan':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 ${textClass}`}>
          <AlertCircle className={`${iconSize} text-rose-600`} />
          <span>Perlu Perbaikan</span>
        </span>
      );
    case 'Draft':
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 ${textClass}`}>
          <FileEdit className={`${iconSize} text-amber-600`} />
          <span>Draft</span>
        </span>
      );
  }
};
