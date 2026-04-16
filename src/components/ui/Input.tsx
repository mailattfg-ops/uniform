import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  allowSpecialCharacters?: boolean;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, allowSpecialCharacters = false, className = '', ...props }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!allowSpecialCharacters && (props.type === 'text' || props.type === 'tel' || !props.type)) {
      // Allow alphanumeric, spaces, and basic business symbols (@ . + - , _)
      // Filter out symbols like ^ & * ( ) % $ # ! ~ ` = { } [ ] | \ : ; " ' < > ? /
      const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s\@\.\+\-\,\_]/g, '');
      if (sanitized !== e.target.value) {
        e.target.value = sanitized;
      }
    }
    props.onChange?.(e);
  };

  return (
    <div className="flex flex-col gap-2 w-full group">
      {label && (
        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] ml-1 transition-colors group-focus-within:text-[#2d8d9b]">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-4 text-[#2d8d9b]/50 group-focus-within:text-[#2d8d9b] transition-colors pointer-events-none">
            {icon}
          </div>
        )}
        <input
          className={`w-full px-5 py-3.5 bg-[#fce4d4]/5 border-2 ${
            error ? 'border-error' : 'border-[#fce4d4] hover:border-[#fce4d4]/80'
          } rounded-[1.2rem] focus:outline-none focus:ring-4 focus:ring-[#fce4d4]/30 focus:border-[#2d8d9b] transition-all text-sm font-bold text-foreground placeholder:text-zinc-300 shadow-sm ${
            icon ? 'pl-12' : ''
          } ${className}`}
          {...props}
          onChange={handleChange}
        />
      </div>
      {error && <span className="text-[10px] text-error font-black uppercase tracking-widest ml-1 animate-in shake duration-300">{error}</span>}
    </div>
  );
};
