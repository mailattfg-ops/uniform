import React from 'react';
import { AlertTriangle, Star } from 'lucide-react';

export interface CustomerRiskFavBadgeProps {
  isRisk?: boolean | null | string | number;
  isSpecial?: boolean | null | string | number;
  clientTag?: string | null;
  customer?: any;
  className?: string;
  size?: number;
}

export const CustomerRiskFavBadge: React.FC<CustomerRiskFavBadgeProps> = ({
  isRisk,
  isSpecial,
  clientTag,
  customer,
  className = '',
  size = 15
}) => {
  const c = customer || {};

  const showRisk = Boolean(
    isRisk === true ||
    isRisk === 'true' ||
    isRisk === 1 ||
    clientTag === 'risk' ||
    c.is_risk === true ||
    c.is_risk === 'true' ||
    c.is_risk === 1 ||
    c.client_tag === 'risk'
  );

  const showSpecial = !showRisk && Boolean(
    isSpecial === true ||
    isSpecial === 'true' ||
    isSpecial === 1 ||
    clientTag === 'special' ||
    c.is_special === true ||
    c.is_special === 'true' ||
    c.is_special === 1 ||
    c.client_tag === 'special'
  );

  if (!showRisk && !showSpecial) return null;

  return (
    <span className={`inline-flex items-center gap-1 shrink-0 select-none ${className}`}>
      {showRisk && (
        <span 
          title="Risk Customer" 
          className="shrink-0 text-rose-500 inline-flex items-center justify-center transition-transform hover:scale-110"
        >
          <AlertTriangle size={size} className="stroke-[2.5]" />
        </span>
      )}
      {showSpecial && (
        <span 
          title="Favourite Customer" 
          className="shrink-0 text-amber-500 inline-flex items-center justify-center transition-transform hover:scale-110"
        >
          <Star size={size} className="fill-amber-400 text-amber-400" />
        </span>
      )}
    </span>
  );
};

export default CustomerRiskFavBadge;
