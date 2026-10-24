'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Printer } from 'lucide-react';

export interface PageActionsMenuProps {
  onPrint?: () => void;
  printLabel?: string;
  className?: string;
  buttonClassName?: string;
  size?: 'header' | 'sm' | 'md';
  extraActions?: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    danger?: boolean;
  }>;
}

export const PageActionsMenu: React.FC<PageActionsMenuProps> = ({
  onPrint,
  printLabel = 'Print',
  className = '',
  buttonClassName = '',
  size = 'header',
  extraActions = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!onPrint && (!extraActions || extraActions.length === 0)) {
    return null;
  }

  const baseButtonClass = size === 'header'
    ? 'h-14 w-14 rounded-[1.25rem] bg-white hover:bg-zinc-50 border border-zinc-200/80 text-[#3a525d] hover:text-[#2d8d9b] shadow-sm flex items-center justify-center transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
    : 'h-10 w-10 rounded-xl bg-white hover:bg-[#fce4d4]/20 border border-[#fce4d4] hover:border-[#2d8d9b]/60 text-[#3a525d] hover:text-[#2d8d9b] shadow-2xs flex items-center justify-center transition-all cursor-pointer';

  return (
    <div className={`relative shrink-0 ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`${baseButtonClass} ${isOpen ? '!border-[#2d8d9b] !text-[#2d8d9b] ring-2 ring-[#2d8d9b]/20 bg-[#2d8d9b]/5' : ''} ${buttonClassName}`}
        title="More options"
        aria-label="More options"
        aria-expanded={isOpen}
      >
        <MoreVertical size={size === 'header' ? 18 : 16} strokeWidth={2.5} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-48 bg-white border border-zinc-200/80 rounded-2xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-150 ring-4 ring-black/5">
          {onPrint && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onPrint();
              }}
              className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-[#3a525d] hover:bg-[#fce4d4]/20 hover:text-[#2d8d9b] flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Printer size={15} className="text-[#2d8d9b] shrink-0" />
              <span>{printLabel}</span>
            </button>
          )}

          {extraActions.map((action, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setIsOpen(false);
                action.onClick();
              }}
              className={`w-full px-3.5 py-2.5 text-left text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
                action.danger
                  ? 'text-rose-600 hover:bg-rose-50'
                  : 'text-[#3a525d] hover:bg-[#fce4d4]/20 hover:text-[#2d8d9b]'
              }`}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
