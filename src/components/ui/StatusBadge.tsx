import React from 'react';
import { CheckCircle2, PauseCircle, XCircle, Clock, ShieldCheck, Box } from 'lucide-react';

export type StatusCategory =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

interface StatusBadgeProps {
  status: string;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Determine category and icon based on standard status text.
 */
function getStatusConfig(status: string): { category: StatusCategory; label: string; icon: any } {
  const s = (status || '').toLowerCase().trim();

  // Success: Accepted, Approved, In Production, Delivered, Paid, Ready
  if (s.includes('accept') || s.includes('approved') || s.includes('in production') || s.includes('delivered') || s.includes('paid') || s === 'ready') {
    return {
      category: 'success',
      label: status,
      icon: CheckCircle2
    };
  }

  // Warning: Hold, Awaiting, Pending, Draft
  if (s.includes('hold') || s.includes('awaiting') || s.includes('pending') || s === 'draft') {
    return {
      category: 'warning',
      label: status.replace('Pending PO Handler', 'Pending'),
      icon: s.includes('hold') ? PauseCircle : Clock
    };
  }

  // Danger: Reject, Cancelled, Failed
  if (s.includes('reject') || s.includes('cancel') || s.includes('fail')) {
    return {
      category: 'danger',
      label: status,
      icon: XCircle
    };
  }

  // Info: Shipped, Dispatched, Inward
  if (s.includes('ship') || s.includes('dispatch') || s.includes('inward')) {
    return {
      category: 'info',
      label: status,
      icon: ShieldCheck
    };
  }

  return {
    category: 'neutral',
    label: status || 'Unknown',
    icon: Box
  };
}

const CATEGORY_STYLES: Record<StatusCategory, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  warning: 'bg-amber-50 text-amber-800 border-amber-200/80',
  danger: 'bg-rose-50 text-rose-700 border-rose-200/80',
  info: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200'
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  showIcon = true,
  size = 'sm'
}) => {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeStyles = size === 'sm'
    ? 'text-[10.5px] px-2.5 py-0.5 gap-1.5'
    : 'text-xs px-3 py-1 gap-2';

  const iconSizes = size === 'sm' ? 12 : 14;

  return (
    <span
      className={`inline-flex items-center font-bold tracking-wide uppercase rounded-full border shadow-xs transition-all ${CATEGORY_STYLES[config.category]} ${sizeStyles} ${className}`}
    >
      {showIcon && <Icon size={iconSizes} className="shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
};
