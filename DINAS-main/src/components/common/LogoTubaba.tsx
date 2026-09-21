import React from 'react';

interface LogoTubabaProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  textColor?: 'light' | 'dark';
  className?: string;
}

export const LogoTubaba: React.FC<LogoTubabaProps> = ({
  size = 'md',
  showText = true,
  textColor = 'dark',
  className = '',
}) => {
  const sizeMap = {
    sm: { img: 'w-8 h-9', title: 'text-sm', sub: 'text-[10px]' },
    md: { img: 'w-11 h-12', title: 'text-base', sub: 'text-xs' },
    lg: { img: 'w-16 h-18', title: 'text-xl', sub: 'text-xs' },
  }[size];

  const titleColor = textColor === 'light' ? 'text-white' : 'text-slate-900';
  const subColor = textColor === 'light' ? 'text-blue-200' : 'text-slate-500';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official SVG Logo of Tulang Bawang Barat */}
      <img
        src="/logo-tubaba.svg"
        alt="Logo Kabupaten Tulang Bawang Barat"
        className={`${sizeMap.img} object-contain drop-shadow-sm transition-transform hover:scale-105`}
      />

      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`font-bold tracking-tight ${sizeMap.title} ${titleColor}`}>
            SURVEY DIGITAL TUBABA
          </span>
          <span className={`font-medium ${sizeMap.sub} ${subColor}`}>
            Kabupaten Tulang Bawang Barat
          </span>
        </div>
      )}
    </div>
  );
};
