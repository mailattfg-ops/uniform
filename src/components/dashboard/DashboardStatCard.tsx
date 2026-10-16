import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DashboardStatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  variant?: 'default' | 'teal' | 'gold' | 'amber' | 'emerald' | 'rose' | 'indigo' | 'purple' | 'blue';
  onClick?: () => void;
  className?: string;
  badge?: string;
}

const variantStyles = {
  default: {
    border: 'border-[#fce4d4] hover:border-[#3a525d]/40',
    iconBg: 'bg-[#3a525d]/5 text-[#3a525d]',
    labelColor: 'text-zinc-500',
    valueColor: 'text-[#3a525d]',
    accentGlow: 'hover:shadow-[#3a525d]/5',
  },
  teal: {
    border: 'border-[#fce4d4] hover:border-[#2d8d9b]',
    iconBg: 'bg-teal-50 text-[#2d8d9b] group-hover:bg-[#2d8d9b] group-hover:text-white',
    labelColor: 'text-[#2d8d9b]',
    valueColor: 'text-zinc-900',
    accentGlow: 'hover:shadow-[#2d8d9b]/10',
  },
  gold: {
    border: 'border-[#fce4d4] hover:border-[#CC9448]',
    iconBg: 'bg-[#CC9448]/10 text-[#CC9448] group-hover:bg-[#CC9448] group-hover:text-white',
    labelColor: 'text-[#CC9448]',
    valueColor: 'text-[#24343b]',
    accentGlow: 'hover:shadow-[#CC9448]/15',
  },
  amber: {
    border: 'border-[#fce4d4] hover:border-amber-400',
    iconBg: 'bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white',
    labelColor: 'text-amber-700',
    valueColor: 'text-amber-800',
    accentGlow: 'hover:shadow-amber-500/10',
  },
  emerald: {
    border: 'border-[#fce4d4] hover:border-emerald-400',
    iconBg: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
    labelColor: 'text-emerald-700',
    valueColor: 'text-emerald-900',
    accentGlow: 'hover:shadow-emerald-500/10',
  },
  rose: {
    border: 'border-[#fce4d4] hover:border-rose-400',
    iconBg: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
    labelColor: 'text-rose-700',
    valueColor: 'text-rose-900',
    accentGlow: 'hover:shadow-rose-500/10',
  },
  indigo: {
    border: 'border-[#fce4d4] hover:border-indigo-400',
    iconBg: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
    labelColor: 'text-indigo-700',
    valueColor: 'text-indigo-900',
    accentGlow: 'hover:shadow-indigo-500/10',
  },
  purple: {
    border: 'border-[#fce4d4] hover:border-purple-400',
    iconBg: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
    labelColor: 'text-purple-700',
    valueColor: 'text-purple-900',
    accentGlow: 'hover:shadow-purple-500/10',
  },
  blue: {
    border: 'border-[#fce4d4] hover:border-blue-400',
    iconBg: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    labelColor: 'text-blue-700',
    valueColor: 'text-blue-900',
    accentGlow: 'hover:shadow-blue-500/10',
  },
};

export const DashboardStatCard: React.FC<DashboardStatCardProps> = ({
  label,
  value,
  subValue,
  icon: Icon,
  variant = 'default',
  onClick,
  className = '',
  badge,
}) => {
  const styles = variantStyles[variant] || variantStyles.default;

  return (
    <div
      onClick={onClick}
      className={`bg-white p-5 rounded-3xl border shadow-xs transition-all duration-300 flex items-center justify-between group relative overflow-hidden ${
        styles.border
      } ${styles.accentGlow} ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''} ${className}`}
    >
      <div className="min-w-0 flex-1 pr-3">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] truncate ${styles.labelColor}`}>
            {label}
          </p>
          {badge && (
            <span className="px-1.5 py-0.5 text-[8px] font-black uppercase rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200">
              {badge}
            </span>
          )}
        </div>
        <h3 className={`text-2xl font-black tracking-tight font-mono ${styles.valueColor}`}>
          {value}
        </h3>
        {subValue && (
          <p className="text-[10px] font-semibold text-zinc-400 mt-1 truncate">
            {subValue}
          </p>
        )}
      </div>

      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${styles.iconBg}`}
      >
        <Icon size={22} strokeWidth={2.2} />
      </div>
    </div>
  );
};
