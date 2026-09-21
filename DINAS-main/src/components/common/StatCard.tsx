import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'slate';
  trend?: string;
  trendPositive?: boolean;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  trend,
  trendPositive = true,
  onClick,
}) => {
  const colorStyles = {
    blue: {
      bg: 'bg-blue-50 text-blue-600 border-blue-100',
      pill: 'bg-blue-100/60 text-blue-700',
      borderHover: 'hover:border-blue-300',
    },
    emerald: {
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      pill: 'bg-emerald-100/60 text-emerald-700',
      borderHover: 'hover:border-emerald-300',
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600 border-amber-100',
      pill: 'bg-amber-100/60 text-amber-700',
      borderHover: 'hover:border-amber-300',
    },
    purple: {
      bg: 'bg-purple-50 text-purple-600 border-purple-100',
      pill: 'bg-purple-100/60 text-purple-700',
      borderHover: 'hover:border-purple-300',
    },
    rose: {
      bg: 'bg-rose-50 text-rose-600 border-rose-100',
      pill: 'bg-rose-100/60 text-rose-700',
      borderHover: 'hover:border-rose-300',
    },
    slate: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      pill: 'bg-slate-200/60 text-slate-800',
      borderHover: 'hover:border-slate-300',
    },
  }[color];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-slate-200/70 shadow-xs transition-all duration-200 ${
        colorStyles.borderHover
      } ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl border ${colorStyles.bg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              trendPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-500 font-normal">{subtitle}</p>}
    </div>
  );
};
