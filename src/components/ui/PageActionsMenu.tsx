'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { MoreVertical, Printer, CalendarCheck } from 'lucide-react';

export interface PageActionItem {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  description?: string;
  danger?: boolean;
}

export interface PageActionsMenuProps {
  onPrint?: () => void;
  printLabel?: string;
  onUserReport?: () => void;
  userReportLabel?: string;
  className?: string;
  buttonClassName?: string;
  size?: 'header' | 'sm' | 'md';
  extraActions?: PageActionItem[];
}

export const PageActionsMenu: React.FC<PageActionsMenuProps> = ({
  onPrint,
  printLabel = 'Print',
  onUserReport,
  userReportLabel = 'My Report',
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

  if (!onPrint && !onUserReport && (!extraActions || extraActions.length === 0)) {
    return null;
  }

  const baseButtonClass = size === 'header'
    ? 'h-14 w-14 rounded-[1.25rem] bg-white hover:bg-zinc-50 border border-zinc-200/80 text-zinc-750 hover:text-zinc-950 shadow-sm flex items-center justify-center transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
    : 'h-10 w-10 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 text-zinc-750 hover:text-zinc-950 shadow-2xs flex items-center justify-center transition-all cursor-pointer';

  return (
    <div className={`relative shrink-0 ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`${baseButtonClass} ${isOpen ? '!border-[#C82A2B] !text-[#9E1B1D] ring-2 ring-[#C82A2B]/20 bg-[#FFF1F1]' : ''} ${buttonClassName}`}
        title="More options"
        aria-label="More options"
        aria-expanded={isOpen}
      >
        <MoreVertical size={size === 'header' ? 18 : 16} strokeWidth={2.5} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-60 bg-white border border-zinc-200/80 rounded-2xl shadow-xl py-2 animate-in fade-in zoom-in-95 duration-150 ring-4 ring-black/5 divide-y divide-zinc-100">
          {(onPrint || onUserReport) && (
            <div className="py-1">
              {onPrint && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onPrint();
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 flex items-center gap-2.5 transition-colors cursor-pointer group"
                >
                  <Printer size={15} className="text-[#9E1B1D] shrink-0 group-hover:scale-110 transition-transform" />
                  <span>{printLabel}</span>
                </button>
              )}

              {onUserReport && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onUserReport();
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 flex items-center gap-2.5 transition-colors cursor-pointer group"
                >
                  <CalendarCheck size={15} className="text-[#9E1B1D] shrink-0 group-hover:scale-110 transition-transform" />
                  <span>{userReportLabel}</span>
                </button>
              )}
            </div>
          )}

          {extraActions && extraActions.length > 0 && (
            <div className="py-1">
              <div className="px-3.5 pt-1.5 pb-1">
                <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Quick Navigation</p>
              </div>
              {extraActions.map((action, idx) => {
                const itemClass = `w-full px-3.5 py-2 text-left text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer group ${
                  action.danger
                    ? 'text-rose-600 hover:bg-rose-50'
                    : 'text-zinc-750 hover:bg-zinc-50 hover:text-zinc-950'
                }`;

                if (action.href) {
                  return (
                    <Link
                      key={idx}
                      href={action.href}
                      onClick={() => setIsOpen(false)}
                      className={itemClass}
                    >
                      {action.icon && <span className="shrink-0 group-hover:scale-110 transition-transform">{action.icon}</span>}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs leading-snug">{action.label}</p>
                        {action.description && (
                          <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5">{action.description}</p>
                        )}
                      </div>
                    </Link>
                  );
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      action.onClick?.();
                    }}
                    className={itemClass}
                  >
                    {action.icon && <span className="shrink-0 group-hover:scale-110 transition-transform">{action.icon}</span>}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs leading-snug">{action.label}</p>
                      {action.description && (
                        <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5">{action.description}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
