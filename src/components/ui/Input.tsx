import React from 'react';
import { capitalizeFirstLetter, capitalizeWords } from '@/lib/formatters';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  suffix?: string;
  icon?: React.ReactNode;
  allowSpecialCharacters?: boolean;
  onlyLetters?: boolean;
  onlyNumbers?: boolean;
  capitalize?: 'first' | 'words' | 'none';
  helperText?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  suffix,
  icon,
  allowSpecialCharacters = false,
  onlyLetters,
  onlyNumbers,
  capitalize,
  helperText,
  className = '',
  ...props
}) => {
  const isExcludedType =
    props.type === 'email' ||
    props.type === 'password' ||
    props.type === 'number' ||
    props.type === 'tel' ||
    props.type === 'url' ||
    props.type === 'file' ||
    props.type === 'date' ||
    props.type === 'time' ||
    onlyNumbers ||
    Boolean(props.name && /email|url|website|link|password/i.test(props.name));

  const effectiveCapitalize: 'first' | 'words' | 'none' =
    capitalize !== undefined
      ? capitalize
      : isExcludedType
      ? 'none'
      : 'first';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (onlyLetters) {
      value = value.replace(/[0-9]/g, '');
    }
    if (onlyNumbers) {
      value = value.replace(/[^0-9]/g, '');
    }

    if (!allowSpecialCharacters && (props.type === 'text' || props.type === 'tel' || !props.type)) {
      value = value.replace(/[^a-zA-Z0-9\s\@\.\+\-\,\_]/g, '');
    }

    if (effectiveCapitalize === 'words') {
      value = capitalizeWords(value);
    } else if (effectiveCapitalize === 'first') {
      value = capitalizeFirstLetter(value);
    }

    if (value !== e.target.value) {
      e.target.value = value;
    }
    props.onChange?.(e);
  };

  const autoCapitalizeValue =
    props.autoCapitalize ||
    (effectiveCapitalize === 'words'
      ? 'words'
      : effectiveCapitalize === 'first'
      ? 'sentences'
      : 'none');

  return (
    <div className={`flex flex-col gap-2 w-full group ${props.disabled ? 'opacity-40' : ''}`}>
      {label && (
        <label className={`text-[11px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] ml-1 transition-colors ${!props.disabled ? 'group-focus-within:text-[#2d8d9b]' : ''}`}>
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className={`absolute left-4 ${props.disabled ? 'text-zinc-300' : 'text-[#2d8d9b]/50 group-focus-within:text-[#2d8d9b]'} transition-colors pointer-events-none`}>
            {icon}
          </div>
        )}
        <input
          className={`w-full px-5 py-3.5 bg-white border-2 ${
            error ? 'border-red-500' : 'border-zinc-200 hover:border-[#2d8d9b]/50'
          } rounded-[1.2rem] focus:outline-none focus:ring-4 focus:ring-[#2d8d9b]/10 focus:border-[#2d8d9b] transition-all text-sm font-bold text-[#3a525d] placeholder:text-zinc-400 shadow-sm ${
            icon ? 'pl-12' : ''
          } ${suffix ? 'pr-14' : ''} ${props.disabled ? 'bg-zinc-50 cursor-not-allowed' : ''} ${className}`}
          autoCapitalize={autoCapitalizeValue}
          {...props}
          onChange={handleChange}
        />
        {suffix && (
          <div className="absolute right-5 text-[10px] font-black uppercase text-zinc-300 pointer-events-none">
            {suffix}
          </div>
        )}
      </div>
      {error && <span className="text-[10px] text-error font-black uppercase tracking-widest ml-1 animate-in shake duration-300">{error}</span>}
      {helperText && !error && (
        <span className="text-[11px] font-semibold text-amber-700/95 ml-1 flex items-center gap-1.5 mt-0.5">
          {helperText}
        </span>
      )}
    </div>
  );
};
