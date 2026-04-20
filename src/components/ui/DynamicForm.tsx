'use client';

import React from 'react';
import { Input } from './Input';
import { Select } from './Select';
import { Button } from './Button';
import { 
  User, 
  Hash, 
  School, 
  GraduationCap, 
  Users, 
  Phone, 
  Mail, 
  Calendar, 
  Shield, 
  MapPin,
  FileText,
  Layers
} from 'lucide-react';

const getFieldIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('name')) return <User size={18} />;
  if (n.includes('number') || n.includes('no') || n.includes('admission')) return <Hash size={18} />;
  if (n.includes('school')) return <School size={18} />;
  if (n.includes('class') || n.includes('grade')) return <GraduationCap size={18} />;
  if (n.includes('guardian') || n.includes('parent')) return <Users size={18} />;
  if (n.includes('mobile') || n.includes('phone') || n.includes('tel')) return <Phone size={18} />;
  if (n.includes('mail')) return <Mail size={18} />;
  if (n.includes('date') || n.includes('birth')) return <Calendar size={18} />;
  if (n.includes('id') || n.includes('security')) return <Shield size={18} />;
  if (n.includes('address') || n.includes('city') || n.includes('location')) return <MapPin size={18} />;
  if (n.includes('material')) return <Layers size={18} />;
  return <FileText size={18} />;
};

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'email' | 'tel' | 'checkbox-group';
  placeholder?: string;
  options?: { label: string; value: string }[];
  required?: boolean;
  className?: string;
  defaultValue?: any;
  onChange?: (value: any) => void;
}

interface DynamicFormProps {
  title?: string;
  subtitle?: string;
  fields: FormField[];
  onSubmit: (data: any) => void;
  onCancel?: () => void;
  submitLabel?: string;
  columns?: 1 | 2 | 3;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({ 
  title, 
  subtitle, 
  fields, 
  onSubmit, 
  onCancel,
  submitLabel = "Submit",
  columns = 2
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data: any = {};
    
    formData.forEach((value, key) => {
      if (data[key]) {
        if (Array.isArray(data[key])) {
          data[key].push(value);
        } else {
          data[key] = [data[key], value];
        }
      } else {
        data[key] = value;
      }
    });

    onSubmit(data);
  };

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  }[columns];

  return (
    <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-[#fce4d4] shadow-2xl max-w-5xl mx-auto transition-all duration-300">
      
      {(title || subtitle) && (
        <div className="bg-[#fce4d4]/20 p-5 md:p-8 border-b border-[#fce4d4] rounded-t-[2rem] md:rounded-t-[3rem]">
          {title && <h3 className="text-xl md:text-2xl font-black italic tracking-tight text-[#3a525d]">{title}</h3>}
          {subtitle && (
            <p className="text-[9px] md:text-[10px] text-[#2d8d9b] font-black uppercase tracking-[0.3em] opacity-80 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-6 md:space-y-8">
        <div className={`grid gap-x-10 gap-y-6 ${gridCols}`}>
          {fields.map((field) => (
            <div key={field.name} className={`${field.className} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
              {field.type === 'select' ? (
                <Select 
                  label={field.label} 
                  name={field.name}
                  options={field.options || []} 
                  required={field.required}
                  icon={getFieldIcon(field.name)}
                  defaultValue={field.defaultValue}
                  onChange={(val) => field.onChange && field.onChange(val)}
                />
              ) : field.type === 'checkbox-group' ? (
                <div className="space-y-4 p-6 bg-zinc-50/50 rounded-3xl border border-zinc-100">
                   <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] ml-1">
                     {field.label}
                   </label>
                   <div className="grid grid-cols-2 gap-4">
                     {field.options?.map((opt) => (
                       <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            name={field.name} 
                            value={opt.value}
                            defaultChecked={field.defaultValue?.includes(opt.value)}
                            className="w-5 h-5 rounded-lg border-2 border-zinc-200 text-[#2d8d9b] focus:ring-[#2d8d9b]"
                          />
                          <span className="text-xs font-bold text-[#3a525d] group-hover:text-[#2d8d9b] transition-colors">
                            {opt.label}
                          </span>
                       </label>
                     ))}
                   </div>
                </div>
              ) : (
                <Input 
                  label={field.label} 
                  name={field.name}
                  type={field.type} 
                  placeholder={field.placeholder} 
                  required={field.required}
                  icon={getFieldIcon(field.name)}
                  defaultValue={field.defaultValue}
                  onChange={(e) => field.onChange && field.onChange(e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Improved high-visibility footer */}
        <div className="flex justify-end items-center gap-4 pt-8 border-t border-[#fce4d4]/40">
          {onCancel && (
            <button 
              type="button"
              onClick={onCancel}
              className="text-xs font-black text-[#8b6b5a] uppercase tracking-widest hover:text-[#3a525d] transition-colors"
            >
              Cancel Entry
            </button>
          )}
          <Button 
            type="submit" 
            variant="primary" 
            className="px-12 py-4 h-auto shadow-2xl shadow-[#2d8d9b]/40 bg-[#2d8d9b] text-white"
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
};
