import React from 'react';
import { LucideIcon, RefreshCw } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  badge?: string;
  category?: string | null;
  icon?: LucideIcon;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  badge = 'FORMA APPARELS',
  category,
  icon: Icon,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
      <div>
        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
          {badge && (
            <span className="px-3 py-0.5 rounded-full bg-[#CC9448]/15 border border-[#CC9448]/30 text-[9px] font-black uppercase tracking-[0.2em] text-[#CC9448]">
              {badge}
            </span>
          )}
          {category !== null && category !== '' && (
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#2d8d9b]">
              {category !== undefined ? category : 'Overview & Telemetry'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-2xl bg-[#3a525d] text-white flex items-center justify-center shadow-md">
              <Icon size={20} strokeWidth={2.5} />
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-[#3a525d]">
            {title}
          </h1>
        </div>
        <p className="text-xs font-semibold text-zinc-500 mt-1 max-w-2xl">
          {subtitle}
        </p>
      </div>

      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-50 border border-[#fce4d4] text-[#3a525d] text-xs font-black uppercase tracking-wider shadow-xs hover:shadow transition-all disabled:opacity-50"
          title="Refresh statistics"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#2d8d9b]' : ''} />
          <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
        </button>
      )}
    </div>
  );
};
