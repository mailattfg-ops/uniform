import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'none';
  size?: 'sm' | 'md' | 'lg' | 'h-auto' | 'none';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant, 
  size,
  isLoading, 
  className = '', 
  ...props 
}) => {
  const baseStyles = 'rounded-2xl font-black text-xs uppercase tracking-widest transition-all focus:outline-none focus:ring-4 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center';
  
  const hasCustomBg = className.includes('bg-');
  const hasCustomText = className.includes('text-');
  const hasCustomBorder = className.includes('border-');

  let variantClass = '';
  if (variant === 'none') {
    variantClass = '';
  } else if (variant) {
    const variants = {
      primary: 'bg-[#C82A2B] text-white shadow-lg shadow-[#C82A2B]/25 hover:bg-[#A81D1E] hover:shadow-xl hover:shadow-[#C82A2B]/35 hover:scale-[1.02] focus:ring-[#C82A2B]/30',
      secondary: 'bg-[#FEF2F2] text-[#9E1B1D] border-2 border-red-200/90 hover:bg-red-100/80 hover:border-red-300 hover:text-[#7F1D1D] focus:ring-red-200/50 shadow-xs hover:shadow-sm',
      danger: 'bg-[#DC2626] text-white shadow-lg shadow-red-600/20 hover:bg-[#B91C1C] hover:shadow-xl hover:scale-[1.02] focus:ring-red-500/30',
      ghost: 'bg-transparent text-zinc-600 hover:bg-[#FEF2F2] hover:text-[#C82A2B] focus:ring-red-100',
      outline: 'bg-transparent border-2 border-[#C82A2B]/40 text-[#C82A2B] hover:bg-[#C82A2B]/10 hover:border-[#C82A2B] hover:text-[#A81D1E] focus:ring-[#C82A2B]/20'
    };
    // If secondary was passed but custom styling is provided, avoid forcing custom border and bg
    if (variant === 'secondary' && (hasCustomBg || hasCustomText || hasCustomBorder)) {
      variantClass = '';
    } else {
      variantClass = variants[variant] || '';
    }
  } else if (!hasCustomBg && !hasCustomText) {
    variantClass = 'bg-[#C82A2B] text-white shadow-lg shadow-[#C82A2B]/25 hover:bg-[#A81D1E] hover:shadow-xl hover:scale-[1.02] focus:ring-[#C82A2B]/30';
  }

  let sizeClass = '';
  if (size === 'none' || size === 'h-auto') {
    sizeClass = '';
  } else if (size) {
    const sizes = {
      sm: 'px-4 py-2 text-[10px]',
      md: 'px-6 py-3 text-xs',
      lg: 'px-8 py-4 text-sm',
      'h-auto': ''
    };
    sizeClass = sizes[size] || '';
  } else if (!className.includes('p-') && !className.includes('px-') && !className.includes('py-') && !className.includes('h-') && !className.includes('w-')) {
    sizeClass = 'px-6 py-3 text-xs';
  }

  const combinedClasses = `${baseStyles} ${variantClass} ${sizeClass} ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <button 
      className={combinedClasses}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 mr-2 shrink-0" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : null}
      {children}
    </button>
  );
};

