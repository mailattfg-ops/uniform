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
      primary: 'bg-[#2d8d9b] text-white shadow-xl shadow-[#2d8d9b]/20 hover:bg-[#236e7a] hover:shadow-2xl hover:scale-105 focus:ring-[#2d8d9b]/30',
      secondary: 'bg-white text-[#8b6b5a] border-2 border-[#fce4d4] hover:bg-[#fce4d4]/10 focus:ring-[#fce4d4]/50',
      danger: 'bg-error text-white shadow-xl shadow-error/20 hover:bg-error/90 focus:ring-error/50',
      ghost: 'bg-transparent text-muted-foreground hover:bg-muted/50 focus:ring-muted/50',
      outline: 'bg-transparent border-2 border-[#3a525d]/10 text-[#3a525d] hover:bg-[#3a525d]/5'
    };
    // If secondary was passed but custom styling is provided, avoid forcing border-[#fce4d4] and bg-white
    if (variant === 'secondary' && (hasCustomBg || hasCustomText || hasCustomBorder)) {
      variantClass = '';
    } else {
      variantClass = variants[variant] || '';
    }
  } else if (!hasCustomBg && !hasCustomText) {
    variantClass = 'bg-[#2d8d9b] text-white shadow-xl shadow-[#2d8d9b]/20 hover:bg-[#236e7a] hover:shadow-2xl hover:scale-105 focus:ring-[#2d8d9b]/30';
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

