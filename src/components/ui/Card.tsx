import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'glass' | 'solid' | 'elevated' | 'none';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', variant = 'solid', onClick }) => {
  const themes = {
    solid: 'bg-white border border-zinc-100 shadow-xl',
    glass: 'bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl',
    elevated: 'bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-zinc-50',
    none: ''
  };

  // If the className contains a background class (bg-), we strip the theme background
  const finalTheme = className.includes('bg-') ? themes.none : themes[variant];

  return (
    <div 
      onClick={onClick}
      className={`${finalTheme} rounded-[2.5rem] ${className} ${onClick ? 'cursor-pointer active:scale-[0.98] transition-all' : ''}`}
    >
      {children}
    </div>
  );
};
