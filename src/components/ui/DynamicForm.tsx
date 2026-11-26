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
  Camera,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  UploadCloud,
  Move
} from 'lucide-react';
import toast from '@/components/ui/toast';
import { capitalizeFirstLetter } from '@/lib/formatters';


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
  type: 'text' | 'textarea' | 'select' | 'number' | 'email' | 'tel' | 'checkbox-group' | 'password' | 'image-upload' | 'custom';
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
  helperText?: React.ReactNode;
  render?: (value: any, onChange: (val: any) => void) => React.ReactNode;
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
  submitLabel = "Save",
  columns = 2
}) => {
  const [checkboxState, setCheckboxState] = useState<Record<string, string[]>>({});
  const [imagesState, setImagesState] = useState<Record<string, string[]>>({});
  const lastDefaultValues = useRef<string>('');

  useEffect(() => {
    // Only update checkboxState and imagesState if defaultValues have actually changed (e.g. switching products)
    const currentDefaults = fields
      .filter(f => f.type === 'checkbox-group' || f.type === 'image-upload' || f.type === 'custom')
      .map(f => `${f.name}:${JSON.stringify(f.defaultValue || f.value)}`)
      .join('|');

    if (currentDefaults !== lastDefaultValues.current) {
      const initialCheckboxState: Record<string, any> = {};
      const initialImagesState: Record<string, string[]> = {};
      fields.forEach(f => {
        if (f.type === 'checkbox-group') {
          initialCheckboxState[f.name] = f.defaultValue || [];
        } else if (f.type === 'image-upload') {
          initialImagesState[f.name] = f.defaultValue || [];
        } else if (f.type === 'custom') {
          initialCheckboxState[f.name] = f.value !== undefined ? f.value : (f.defaultValue !== undefined ? f.defaultValue : null);
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
      } else if (f.type === 'custom') {
        data[f.name] = checkboxState[f.name] !== undefined ? checkboxState[f.name] : (f.value !== undefined ? f.value : f.defaultValue);
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
    <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-zinc-200/80 shadow-2xl max-w-5xl mx-auto transition-all duration-300">
      
      {(title || subtitle) && (
        <div className="bg-zinc-50/60 p-5 md:p-8 border-b border-zinc-200 rounded-t-[2rem] md:rounded-t-[3rem]">
          {title && <h3 className="text-xl md:text-2xl font-black tracking-tight text-zinc-900">{title}</h3>}
          {subtitle && (
            <p className="text-[9px] md:text-[10px] text-[#9E1B1D] font-black uppercase tracking-[0.3em] opacity-80 mt-1">
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
                  onChange={(val: any) => {
                    const cleanVal = (val && typeof val === 'object' && 'target' in val && val.target) ? val.target.value : val;
                    if (field.onChange) field.onChange(cleanVal);
                  }}
                  disabled={field.disabled}
                />
              ) : field.type === 'checkbox-group' ? (
                <div className={`space-y-4 p-6 bg-zinc-50/50 rounded-3xl border border-zinc-100 transition-all ${field.disabled ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                   <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-700 ml-1">
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
                            className="w-5 h-5 rounded-lg border-2 border-zinc-200 text-[#9E1B1D] focus:ring-[#C82A2B]"
                          />
                          <span className="text-xs font-bold text-zinc-900 group-hover:text-[#9E1B1D] transition-colors">
                            {opt.label}
                          </span>
                       </label>
                     ))}
                   </div>
                </div>
              ) : field.type === 'image-upload' ? (
                <div className={`space-y-4 p-6 bg-zinc-50/50 rounded-3xl border border-zinc-100 transition-all ${field.disabled ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                   {(() => {
                     const maxImg = field.maxImages || 5;
                     const labelText = field.uploadLabel || (maxImg === 1 ? 'Upload Image' : `Upload Images (up to ${maxImg})`);
                     const currentImages = imagesState[field.name] || [];

                     const handleFiles = (files: File[]) => {
                       const validFiles = files.filter(f => f.type.startsWith('image/'));
                       if (validFiles.length === 0) {
                         toast.error('Please upload valid image files (PNG, JPG, WEBP, etc.)');
                         return;
                       }
                       if (currentImages.length + validFiles.length > maxImg) {
                         toast.error(`You can upload a maximum of ${maxImg} images.`);
                         return;
                       }

                       let loadedCount = 0;
                       const newBase64List: string[] = [];

                       validFiles.forEach(file => {
                         if (file.size > 5 * 1024 * 1024) {
                           toast.error(`Image "${file.name}" exceeds 5MB limit and was skipped.`);
                           loadedCount++;
                           if (loadedCount === validFiles.length && newBase64List.length > 0) {
                             setImagesState(prev => {
                               const existing = prev[field.name] || [];
                               const updated = [...existing, ...newBase64List].slice(0, maxImg);
                               if (field.onChange) field.onChange(updated);
                               return { ...prev, [field.name]: updated };
                             });
                           }
                           return;
                         }

                         const reader = new FileReader();
                         reader.onloadend = () => {
                           const base64 = reader.result as string;
                           newBase64List.push(base64);
                           loadedCount++;
                           if (loadedCount === validFiles.length) {
                             setImagesState(prev => {
                               const existing = prev[field.name] || [];
                               const updated = [...existing, ...newBase64List].slice(0, maxImg);
                               if (field.onChange) field.onChange(updated);
                               return { ...prev, [field.name]: updated };
                             });
                             toast.success(`${newBase64List.length} image(s) added!`);
                           }
                         };
                         reader.onerror = () => {
                           loadedCount++;
                           toast.error(`Failed to read "${file.name}"`);
                         };
                         reader.readAsDataURL(file);
                       });
                     };

                     const handleReorder = (fromIndex: number, toIndex: number) => {
                       if (fromIndex < 0 || fromIndex >= currentImages.length || toIndex < 0 || toIndex >= currentImages.length) return;
                       setImagesState(prev => {
                         const list = [...(prev[field.name] || [])];
                         const [moved] = list.splice(fromIndex, 1);
                         list.splice(toIndex, 0, moved);
                         if (field.onChange) field.onChange(list);
                         return { ...prev, [field.name]: list };
                       });
                     };

                     const handleMove = (index: number, direction: 'left' | 'right') => {
                       const targetIndex = direction === 'left' ? index - 1 : index + 1;
                       if (targetIndex >= 0 && targetIndex < currentImages.length) {
                         handleReorder(index, targetIndex);
                       }
                     };

                     const handleRemove = (index: number) => {
                       setImagesState(prev => {
                         const updated = (prev[field.name] || []).filter((_, i) => i !== index);
                         if (field.onChange) field.onChange(updated);
                         return { ...prev, [field.name]: updated };
                       });
                     };

                     const handleClearAll = () => {
                       setImagesState(prev => {
                         if (field.onChange) field.onChange([]);
                         return { ...prev, [field.name]: [] };
                       });
                     };

                     return (
                       <div className="flex flex-col gap-3">
                         {/* Header row */}
                         <div className="flex items-center justify-between flex-wrap gap-2">
                           <div className="flex items-center gap-2">
                             <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-700 ml-1">
                               {field.label} ({currentImages.length} / {maxImg})
                             </label>
                           </div>
                           <div className="flex items-center gap-3">
                             {currentImages.length > 1 && (
                               <span className="text-[10px] text-zinc-400 font-medium hidden sm:inline">
                                 Drag or use arrows to rearrange • First image is Cover
                               </span>
                             )}
                             {currentImages.length > 0 && (
                               <button
                                 type="button"
                                 onClick={handleClearAll}
                                 className="text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer transition-colors"
                               >
                                 <Trash2 size={11} /> Clear All
                               </button>
                             )}
                           </div>
                         </div>

                         {/* Hidden File Input */}
                         <input 
                           type="file"
                           accept="image/*"
                           multiple={maxImg > 1}
                           disabled={field.disabled || currentImages.length >= maxImg}
                           onChange={(e) => {
                             const files = Array.from(e.target.files || []);
                             if (files.length > 0) {
                               handleFiles(files);
                               e.target.value = '';
                             }
                           }}
                           className="hidden"
                           id={`file-upload-${field.name}`}
                         />

                         {/* Image Thumbnails & Add tile */}
                         {currentImages.length > 0 ? (
                           <div className="space-y-3">
                             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 p-3 bg-white rounded-2xl border border-zinc-200">
                               {currentImages.map((img, idx) => (
                                 <div
                                   key={idx}
                                   draggable={!field.disabled}
                                   onDragStart={(e) => {
                                     e.dataTransfer.setData('text/plain', String(idx));
                                     e.dataTransfer.effectAllowed = 'move';
                                   }}
                                   onDragOver={(e) => {
                                     e.preventDefault();
                                     e.dataTransfer.dropEffect = 'move';
                                   }}
                                   onDrop={(e) => {
                                     e.preventDefault();
                                     const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                                     if (!isNaN(fromIdx) && fromIdx !== idx) {
                                       handleReorder(fromIdx, idx);
                                     }
                                   }}
                                   className="relative aspect-square rounded-xl overflow-hidden bg-zinc-50 border border-zinc-200 group shadow-xs select-none cursor-grab active:cursor-grabbing hover:border-zinc-400 transition-all"
                                   title="Drag to reorder or use arrow buttons"
                                 >
                                   <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover pointer-events-none" />
                                   
                                   {/* Badge */}
                                   {idx === 0 ? (
                                     <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#9E1B1D] text-white text-[8px] font-black uppercase tracking-wider rounded-md shadow-xs z-10">
                                       Cover
                                     </span>
                                   ) : (
                                     <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[8px] font-bold rounded-md shadow-xs z-10">
                                       #{idx + 1}
                                     </span>
                                   )}

                                   {/* Hover Controls Overlay */}
                                   <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5 z-20">
                                     <div className="flex items-center justify-between">
                                       <span className="text-white/80 p-0.5" title="Drag to rearrange">
                                         <Move size={12} />
                                       </span>
                                       <button
                                         type="button"
                                         onClick={() => handleRemove(idx)}
                                         className="w-6 h-6 rounded-md bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-transform hover:scale-110 shadow-sm cursor-pointer"
                                         title="Remove image"
                                       >
                                         <Trash2 size={12} />
                                       </button>
                                     </div>

                                     {/* Rearrange Arrows */}
                                     <div className="flex items-center justify-between gap-1 mt-auto">
                                       <button
                                         type="button"
                                         disabled={idx === 0}
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           handleMove(idx, 'left');
                                         }}
                                         className="h-6 flex-1 rounded bg-white/90 hover:bg-white text-zinc-900 disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-all shadow-xs"
                                         title="Move left"
                                       >
                                         <ChevronLeft size={13} strokeWidth={2.5} />
                                       </button>
                                       <button
                                         type="button"
                                         disabled={idx === currentImages.length - 1}
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           handleMove(idx, 'right');
                                         }}
                                         className="h-6 flex-1 rounded bg-white/90 hover:bg-white text-zinc-900 disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-all shadow-xs"
                                         title="Move right"
                                       >
                                         <ChevronRight size={13} strokeWidth={2.5} />
                                       </button>
                                     </div>
                                   </div>
                                 </div>
                               ))}

                               {/* Add More Tile */}
                               {currentImages.length < maxImg && (
                                 <label
                                   htmlFor={`file-upload-${field.name}`}
                                   className="aspect-square rounded-xl border-2 border-dashed border-zinc-300 hover:border-[#9E1B1D] bg-zinc-50/50 hover:bg-zinc-50 flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-[#9E1B1D] transition-all cursor-pointer shadow-2xs group"
                                 >
                                   <Plus size={20} className="group-hover:scale-110 transition-transform" />
                                   <span className="text-[10px] font-black uppercase tracking-wider">Add More</span>
                                 </label>
                               )}
                             </div>
                           </div>
                         ) : (
                           /* Empty Dropzone / Upload button */
                           <div
                             onDragOver={(e) => {
                               e.preventDefault();
                             }}
                             onDrop={(e) => {
                               e.preventDefault();
                               if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                 handleFiles(Array.from(e.dataTransfer.files));
                               }
                             }}
                             className="border-2 border-dashed border-zinc-200 hover:border-[#9E1B1D] rounded-2xl p-6 bg-white flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
                             onClick={() => {
                               document.getElementById(`file-upload-${field.name}`)?.click();
                             }}
                           >
                             <div className="w-12 h-12 rounded-xl bg-zinc-100 group-hover:bg-[#FFF1F1] text-zinc-400 group-hover:text-[#9E1B1D] flex items-center justify-center transition-colors mb-2">
                               <UploadCloud size={24} />
                             </div>
                             <p className="text-xs font-bold text-zinc-800">
                               {labelText}
                             </p>
                             <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                               Click to browse or drag & drop multiple images (up to {maxImg} images, 5MB each)
                             </p>
                           </div>
                         )}
                       </div>
                     );
                   })()}
                </div>
              ) : field.type === 'custom' ? (
                <div className={`space-y-4 p-6 bg-zinc-50/50 rounded-3xl border border-zinc-100 transition-all ${field.disabled ? 'opacity-30 grayscale pointer-events-none' : ''} ${field.className || ''}`}>
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-700 ml-1 block mb-2">
                    {field.label}
                  </label>
                  {field.render && field.render(
                    checkboxState[field.name] !== undefined ? checkboxState[field.name] : (field.value !== undefined ? field.value : field.defaultValue),
                    (val) => {
                      setCheckboxState(prev => ({ ...prev, [field.name]: val }));
                      if (field.onChange) field.onChange(val);
                    }
                  )}
                </div>
              ) : field.type === 'textarea' ? (
                <div className={`flex flex-col gap-2 w-full group ${field.disabled ? 'opacity-40' : ''}`}>
                  {field.label && (
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-700 ml-1 transition-colors group-focus-within:text-[#9E1B1D]">
                      {field.label}
                    </label>
                  )}
                  <textarea
                    name={field.name}
                    placeholder={field.placeholder}
                    required={field.required}
                    defaultValue={field.value !== undefined ? undefined : field.defaultValue}
                    value={field.value}
                    disabled={field.disabled}
                    readOnly={field.readOnly}
                    rows={4}
                    onChange={(e: any) => {
                      const val = capitalizeFirstLetter(e.target.value);
                      if (val !== e.target.value) {
                        e.target.value = val;
                      }
                      if (field.onChange) field.onChange(val);
                    }}
                    autoCapitalize="sentences"
                    className="w-full px-5 py-3.5 bg-white border-2 border-zinc-200 hover:border-[#C82A2B]/40 rounded-[1.2rem] focus:outline-none focus:ring-4 focus:ring-[#C82A2B]/10 focus:border-[#C82A2B] transition-all text-sm font-bold text-zinc-900 placeholder:text-zinc-400 shadow-sm"
                  />
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
                  helperText={field.helperText}
                  onChange={(e: any) => {
                    if (field.onChange) field.onChange(e.target.value);
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Improved high-visibility footer */}
        <div className="flex justify-end items-center gap-4 pt-8 border-t border-zinc-200">
          {onCancel && (
            <button 
              type="button"
              onClick={onCancel}
              className="text-xs font-black text-zinc-700 uppercase tracking-widest hover:text-zinc-900 transition-colors"
            >
              Cancel
            </button>
          )}
          <Button 
            type="submit" 
            variant="primary" 
            className="px-12 py-4 h-auto shadow-2xl shadow-[#C82A2B]/25 bg-[#C82A2B] hover:bg-[#A81D1E] text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
};
