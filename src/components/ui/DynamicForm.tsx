'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Layers,
  Camera
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  if (n.includes('material') || n.includes('fabric')) return <Layers size={18} />;
  if (n.includes('username') || n.includes('gender')) return <User size={18} />;
  if (n.includes('password')) return <Shield size={18} />;
  return <FileText size={18} />;
};

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'email' | 'tel' | 'checkbox-group' | 'password' | 'image-upload';
  placeholder?: string;
  options?: { label: string; value: string }[];
  required?: boolean;
  className?: string;
  value?: any;
  defaultValue?: any;
  disabled?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  allowSpecialCharacters?: boolean;
  onlyLetters?: boolean;
  onlyNumbers?: boolean;
  maxLength?: number;
  pattern?: string;
  step?: string;
  onChange?: (value: any) => void;
  maxImages?: number;
  uploadLabel?: string;
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
  const [checkboxState, setCheckboxState] = useState<Record<string, string[]>>({});
  const [imagesState, setImagesState] = useState<Record<string, string[]>>({});
  const lastDefaultValues = useRef<string>('');

  useEffect(() => {
    // Only update checkboxState and imagesState if defaultValues have actually changed (e.g. switching products)
    const currentDefaults = fields
      .filter(f => f.type === 'checkbox-group' || f.type === 'image-upload')
      .map(f => `${f.name}:${JSON.stringify(f.defaultValue)}`)
      .join('|');

    if (currentDefaults !== lastDefaultValues.current) {
      const initialCheckboxState: Record<string, string[]> = {};
      const initialImagesState: Record<string, string[]> = {};
      fields.forEach(f => {
        if (f.type === 'checkbox-group') {
          initialCheckboxState[f.name] = f.defaultValue || [];
        } else if (f.type === 'image-upload') {
          initialImagesState[f.name] = f.defaultValue || [];
        }
      });
      setCheckboxState(initialCheckboxState);
      setImagesState(initialImagesState);
      lastDefaultValues.current = currentDefaults;
    }
  }, [fields]);

  const handleCheckboxChange = (fieldName: string, value: string, checked: boolean) => {
    setCheckboxState(prev => {
      const current = prev[fieldName] || [];
      const updated = checked 
        ? [...current, value]
        : current.filter(v => v !== value);
      
      const field = fields.find(f => f.name === fieldName);
      if (field?.onChange) field.onChange(updated);
      
      return { ...prev, [fieldName]: updated };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data: any = {};
    
    fields.forEach(f => {
      if (f.type === 'checkbox-group') {
        data[f.name] = checkboxState[f.name] || [];
      } else if (f.type === 'image-upload') {
        data[f.name] = imagesState[f.name] || [];
      } else {
        data[f.name] = formData.get(f.name);
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
          {fields.filter(f => !f.hidden).map((field) => (
            <div key={field.name} className={`${field.className} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
              {field.type === 'select' ? (
                <Select 
                  label={field.label} 
                  name={field.name}
                  options={field.options || []} 
                  required={field.required}
                  icon={getFieldIcon(field.name)}
                  defaultValue={field.defaultValue}
                  value={field.value}
                  onChange={(val) => field.onChange && field.onChange(val)}
                  disabled={field.disabled}
                />
              ) : field.type === 'checkbox-group' ? (
                <div className={`space-y-4 p-6 bg-zinc-50/50 rounded-3xl border border-zinc-100 transition-all ${field.disabled ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                   <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] ml-1">
                     {field.label}
                   </label>
                   <div className="grid grid-cols-2 gap-4">
                     {field.options?.map((opt) => (
                       <label key={opt.value} className={`flex items-center gap-3 cursor-pointer group ${field.disabled ? 'cursor-not-allowed' : ''}`}>
                          <input 
                            type="checkbox" 
                            name={field.name} 
                            value={opt.value}
                            checked={checkboxState[field.name]?.includes(opt.value) || false}
                            disabled={field.disabled}
                            onChange={(e) => handleCheckboxChange(field.name, opt.value, e.target.checked)}
                            className="w-5 h-5 rounded-lg border-2 border-zinc-200 text-[#2d8d9b] focus:ring-[#2d8d9b]"
                          />
                          <span className="text-xs font-bold text-[#3a525d] group-hover:text-[#2d8d9b] transition-colors">
                            {opt.label}
                          </span>
                       </label>
                     ))}
                   </div>
                </div>
              ) : field.type === 'image-upload' ? (
                <div className={`space-y-4 p-6 bg-zinc-50/50 rounded-3xl border border-zinc-100 transition-all ${field.disabled ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                   <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] ml-1">
                     {field.label}
                   </label>
                   
                   {(() => {
                     const maxImg = field.maxImages || 3;
                     const labelText = field.uploadLabel || (maxImg === 1 ? 'Upload Image' : 'Upload Images (2-3 Option)');
                     const currentImages = imagesState[field.name] || [];
                     return (
                       <div className="flex flex-col gap-4">
                         <div className="flex items-center gap-3">
                           <input 
                             type="file"
                             accept="image/*"
                             multiple={maxImg > 1}
                             disabled={field.disabled || currentImages.length >= maxImg}
                             onChange={(e) => {
                               const files = Array.from(e.target.files || []);
                               if (files.length === 0) return;
                               
                               if (currentImages.length + files.length > maxImg) {
                                 toast.error(`You can upload a maximum of ${maxImg} image${maxImg > 1 ? 's' : ''}.`);
                                 return;
                               }
                               
                               files.forEach(file => {
                                 const reader = new FileReader();
                                 reader.onloadend = () => {
                                   const base64 = reader.result as string;
                                   setImagesState(prev => {
                                     const existing = prev[field.name] || [];
                                     if (existing.length >= maxImg) return prev;
                                     const updated = [...existing, base64];
                                     if (field.onChange) field.onChange(updated);
                                     return { ...prev, [field.name]: updated };
                                   });
                                 };
                                 reader.readAsDataURL(file);
                               });
                             }}
                             className="hidden"
                             id={`file-upload-${field.name}`}
                           />
                           <label 
                             htmlFor={`file-upload-${field.name}`}
                             className={`h-12 px-6 bg-white border-2 border-zinc-200 text-[#3a525d] hover:bg-zinc-50 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm ${currentImages.length >= maxImg ? 'opacity-50 cursor-not-allowed' : ''}`}
                           >
                             <Camera size={16} />
                             <span>{labelText}</span>
                           </label>
                           <span className="text-[10px] font-bold text-zinc-400">
                             {currentImages.length} of {maxImg} uploaded
                           </span>
                         </div>

                         {/* Previews */}
                         {currentImages.length > 0 && (
                           <div className="flex flex-wrap gap-4 mt-2">
                             {currentImages.map((img, idx) => (
                               <div key={idx} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-zinc-200 bg-white group shadow-sm">
                                 <img src={img} alt="preview" className="w-full h-full object-cover" />
                                 <button
                                   type="button"
                                   onClick={() => {
                                     setImagesState(prev => {
                                       const updated = (prev[field.name] || []).filter((_, i) => i !== idx);
                                       if (field.onChange) field.onChange(updated);
                                       return { ...prev, [field.name]: updated };
                                     });
                                   }}
                                   className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all font-black text-[10px] uppercase cursor-pointer"
                                 >
                                   Remove
                                 </button>
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                     );
                   })()}
                </div>
              ) : (
                <Input 
                  label={field.label} 
                  name={field.name}
                  type={field.type} 
                  placeholder={field.placeholder} 
                  required={field.required}
                  icon={getFieldIcon(field.name)}
                  defaultValue={field.value !== undefined ? undefined : field.defaultValue}
                  value={field.value}
                  disabled={field.disabled}
                  readOnly={field.readOnly}
                  allowSpecialCharacters={field.allowSpecialCharacters}
                  onlyLetters={field.onlyLetters}
                  onlyNumbers={field.onlyNumbers}
                  maxLength={field.maxLength}
                  pattern={field.pattern}
                  step={field.step}
                  onChange={(e: any) => {
                    if (field.onChange) field.onChange(e.target.value);
                  }}
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
