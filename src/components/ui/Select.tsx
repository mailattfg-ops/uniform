import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { label: string; value: string }[];
  error?: string;
  icon?: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ label, options, error, icon, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-2 w-full group">
      {label && (
        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] dark:text-zinc-500 ml-1 transition-colors group-focus-within:text-[#2d8d9b]">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-4 text-[#2d8d9b]/50 group-focus-within:text-[#2d8d9b] transition-colors pointer-events-none">
            {icon}
          </div>
        )}
        <select
          className={`w-full px-5 py-3.5 bg-[#fce4d4]/5 dark:bg-zinc-900/50 border-2 ${
            error ? 'border-error' : 'border-[#fce4d4] hover:border-[#fce4d4]/80'
          } rounded-[1.2rem] focus:outline-none focus:ring-4 focus:ring-[#fce4d4]/30 focus:border-[#2d8d9b] transition-all text-sm font-bold text-foreground appearance-none shadow-sm cursor-pointer ${
            icon ? 'pl-12' : ''
          } ${className}`}
          {...props}
        >
          <option value="" disabled className="text-zinc-300">Select {label}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white dark:bg-zinc-900 text-foreground py-2">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 pointer-events-none text-[#2d8d9b]">
          <ChevronDown size={18} />
        </div>
      </div>
      {error && <span className="text-[10px] text-error font-black uppercase tracking-widest ml-1 animate-in shake duration-300">{error}</span>}
    </div>
  );
};
