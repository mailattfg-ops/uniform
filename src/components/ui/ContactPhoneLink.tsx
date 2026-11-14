'use client';

import React from 'react';
import { Phone, MessageCircle } from 'lucide-react';
import { formatPhoneNumber } from '@/lib/formatters';

export interface ContactPhoneLinkProps {
  phone?: string | null;
  country?: string | null;
  className?: string;
  name?: string | null;
  showWhatsApp?: boolean;
}

export const ContactPhoneLink: React.FC<ContactPhoneLinkProps> = ({
  phone,
  country,
  className = '',
  name,
  showWhatsApp = true
}) => {
  if (!phone || !phone.trim()) {
    return <span className="text-zinc-400 text-xs italic font-medium">—</span>;
  }

  const trimmed = phone.trim();
  const formattedDisplay = formatPhoneNumber(trimmed, country);
  const cleanTel = (formattedDisplay || trimmed).replace(/[^\d+]/g, '');
  const digitsOnly = trimmed.replace(/\D/g, '');
  const waNumber = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly;
  const isDirectable = cleanTel.length >= 7;

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {isDirectable ? (
        <a
          href={`tel:${cleanTel}`}
          data-prevent-row-click
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-800 hover:text-[#C82A2B] transition-colors group/tel cursor-pointer"
          title={`Call ${formattedDisplay || trimmed} (direct to supported dialer)`}
        >
          <Phone size={11} className="text-[#9E1B1D] group-hover/tel:scale-110 transition-transform shrink-0" />
          <span>{formattedDisplay || trimmed}</span>
        </a>
      ) : (
        <span className="text-xs font-mono font-medium text-zinc-700">{formattedDisplay || trimmed}</span>
      )}

      {showWhatsApp && digitsOnly.length >= 10 && (
        <a
          href={`https://wa.me/${waNumber}${name ? `?text=${encodeURIComponent(`Hello ${name},`)}` : ''}`}
          target="_blank"
          rel="noopener noreferrer"
          data-prevent-row-click
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all shrink-0 cursor-pointer"
          title={`Open WhatsApp chat with ${formattedDisplay || trimmed}`}
        >
          <MessageCircle size={12} className="shrink-0" />
        </a>
      )}
    </div>
  );
};
