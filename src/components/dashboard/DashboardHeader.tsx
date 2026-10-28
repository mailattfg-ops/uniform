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
  icon: Icon,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
      <div>
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shadow-md">
              <Icon size={20} strokeWidth={2.5} />
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-zinc-900">
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
          className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs font-black uppercase tracking-wider shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer"
          title="Refresh statistics"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#C82A2B]' : ''} />
          <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
        </button>
      )}
    </div>
  );
};
