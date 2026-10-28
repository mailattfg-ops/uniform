import React from 'react';
import Link from 'next/link';
import { ArrowRight, LucideIcon } from 'lucide-react';

interface DashboardCardGroupProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  targetHref?: string;
  targetLabel?: string;
  children: React.ReactNode;
  columns?: '2' | '3' | '4' | '5';
  badge?: string;
}

export const DashboardCardGroup: React.FC<DashboardCardGroupProps> = ({
  title,
  description,
  icon: Icon,
  targetHref,
  targetLabel,
  children,
  columns = '4',
  badge,
}) => {
  const gridColsClass = {
    '2': 'grid-cols-1 sm:grid-cols-2',
    '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    '5': 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  }[columns];

  return (
    <div className="bg-white/80 backdrop-blur-xs rounded-[2rem] border border-[#fce4d4] p-6 shadow-xs hover:border-[#C82A2B]/30 transition-all duration-300 space-y-5">
      {/* Group Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#fce4d4]/60">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="w-10 h-10 rounded-2xl bg-[#3a525d]/5 text-[#3a525d] flex items-center justify-center shrink-0 border border-[#3a525d]/10">
              <Icon size={20} strokeWidth={2.2} />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black italic tracking-tight text-[#3a525d]">
                {title}
              </h2>
              {badge && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#C82A2B]/10 text-[#C82A2B] border border-[#C82A2B]/20">
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="text-[11px] font-semibold text-zinc-400 mt-0.5 truncate">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Direct Link Button (if targetHref provided) */}
        {targetHref && (
          <Link
            href={targetHref}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#C82A2B] text-[#3a525d] hover:text-white border border-[#fce4d4] hover:border-[#C82A2B] text-xs font-black uppercase tracking-wider shadow-xs hover:shadow-md transition-all duration-200 shrink-0 group"
          >
            <span>{targetLabel || 'View Details'}</span>
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>

      {/* Cards Grid */}
      <div className={`grid ${gridColsClass} gap-4`}>
        {children}
      </div>
    </div>
  );
};
