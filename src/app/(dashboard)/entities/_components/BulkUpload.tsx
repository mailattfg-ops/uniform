'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { FileUp, FileSpreadsheet, CheckCircle2, AlertCircle, X, ArrowRight, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface BulkUploadProps {
  onComplete?: () => void;
}

export const BulkUpload: React.FC<BulkUploadProps> = ({ onComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
       processFile(selectedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);
        
        if (rawData.length === 0) {
           toast.error('The selected file is empty');
           return;
        }

        setData(rawData);
        setFile(selectedFile);
        toast.success(`Loaded ${rawData.length} records from Excel`);
      } catch (err) {
        toast.error('Failed to parse Excel file. Ensure it is a valid .xlsx or .xls file');
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleUpload = async () => {
    if (data.length === 0) return;
    
    setIsUploading(true);
    const loadingToast = toast.loading(`Importing ${data.length} records...`);
    
    try {
      const payload = data.map(item => ({
        full_name: item['Full Name'] || item['Name'] || item['full_name'] || '',
        admission_no: String(item['Reference ID'] || item['Admission No'] || item['ID'] || item['admission_no'] || ''),
        organization_id: item['Organization ID'] || item['School ID'] || item['school_id'] || '',
        department_id: item['Department ID'] || item['Class ID'] || item['class_id'] || '',
        contact_mobile: String(item['Mobile'] || item['Phone'] || item['contact_mobile'] || ''),
        gender: item['Gender'] || item['gender'] || 'Male'
      }));

      const response = await api.post('/members/bulk-register', { members: payload });
      setResults({ success: response.data.successCount, failed: response.data.errorCount });
      toast.success('Data import completed!', { id: loadingToast });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Bulk upload failed', { id: loadingToast });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      { 
        'Full Name': 'John Doe', 
        'Reference ID': 'EMP-2024-001', 
        'Organization ID': 1, 
        'Department ID': 1, 
        'Mobile': '9876543210',
        'Gender': 'Male'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Entity_Import_Template.xlsx');
  };

  if (results) {
    return (
      <div className="max-w-xl mx-auto p-10 bg-white rounded-[3rem] shadow-2xl border border-zinc-100 animate-in zoom-in duration-500">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-[#3a525d]">Import Successful</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-green-50 rounded-3xl border border-green-100">
              <p className="text-[10px] font-black uppercase text-green-600 tracking-widest mb-1">Processed</p>
              <p className="text-3xl font-black text-green-700">{results.success}</p>
            </div>
            <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
              <p className="text-[10px] font-black uppercase text-red-600 tracking-widest mb-1">Errors</p>
              <p className="text-3xl font-black text-red-700">{results.failed}</p>
            </div>
          </div>
          <Button 
            onClick={() => onComplete?.()}
            className="w-full h-14 rounded-2xl bg-[#3a525d] text-white hover:bg-[#2d8d9b] font-black uppercase tracking-widest text-[10px]"
          >
            Back to Registry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-zinc-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
             <h2 className="text-3xl font-black tracking-tight text-[#3a525d] italic">Global Entity Import</h2>
             <p className="text-sm font-bold text-zinc-400 mt-1 uppercase tracking-widest">Connect your entire registry database in one click</p>
          </div>
          <button 
            onClick={downloadTemplate}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] hover:opacity-70 transition-all border-b-2 border-dashed border-[#2d8d9b]"
          >
            <Download size={14} />
            Download Excel Template
          </button>
        </div>

        {!file ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group cursor-pointer border-4 border-dashed border-[#2d8d9b]/10 bg-[#2d8d9b]/5 rounded-[2.5rem] p-20 flex flex-col items-center justify-center text-center transition-all hover:bg-[#2d8d9b]/10 hover:border-[#2d8d9b]/30"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx,.xls" 
              onChange={handleFileChange} 
            />
            <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl flex items-center justify-center text-[#2d8d9b] mb-6 group-hover:scale-110 transition-all">
              <FileUp size={36} />
            </div>
            <h3 className="text-xl font-black text-[#3a525d] mb-2 tracking-tight">Drop Excel file here</h3>
            <p className="text-zinc-500 font-semibold text-sm">Supports .xlsx and .xls formats</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-6 bg-[#3a525d] rounded-3xl text-white shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                   <p className="font-black text-sm tracking-tight">{file.name}</p>
                   <p className="text-[10px] uppercase font-bold opacity-60 tracking-widest">Ready to import {data.length} records</p>
                </div>
              </div>
              <button onClick={() => {setFile(null); setData([]);}} className="p-2 hover:bg-white/10 rounded-xl">
                <X size={20} />
              </button>
            </div>

            <div className="bg-zinc-50 rounded-3xl border border-zinc-200 overflow-hidden">
               <div className="p-4 bg-zinc-100/50 border-b border-zinc-200">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Preview (First 5 records)</p>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm font-bold text-zinc-600">
                    <thead className="bg-white text-[10px] uppercase tracking-wider text-zinc-400">
                       <tr>
                         {Object.keys(data[0] || {}).map(key => <th key={key} className="p-4">{key}</th>)}
                       </tr>
                    </thead>
                    <tbody>
                       {data.slice(0, 5).map((row, i) => (
                         <tr key={i} className="border-t border-zinc-100">
                           {Object.values(row).map((val: any, j) => <td key={j} className="p-4 truncate max-w-[150px]">{val}</td>)}
                         </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
            </div>

            <Button 
               onClick={handleUpload}
               isLoading={isUploading}
               className="w-full h-16 rounded-[1.5rem] bg-[#f2994a] hover:bg-[#e68a3d] text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-orange-500/20"
            >
               {isUploading ? 'Syncing Global Registry...' : `Onboard ${data.length} Entries Now`}
               {!isUploading && <ArrowRight size={18} className="ml-2" />}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
         <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100/50 flex flex-col gap-3">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm">
               <AlertCircle size={20} />
            </div>
            <h4 className="text-sm font-black text-[#3a525d] uppercase tracking-tight">Requirement</h4>
            <p className="text-xs font-semibold text-zinc-500 leading-relaxed">Ensure Excel columns: <span className="text-[#2d8d9b]">Full Name, Reference ID, Organization ID, Department ID</span>. Values must match the system identifiers.</p>
         </div>
         <div className="p-8 bg-amber-50/50 rounded-[2.5rem] border border-amber-100/50 flex flex-col gap-3">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm">
               <Loader2 size={20} className="animate-spin" />
            </div>
            <h4 className="text-sm font-black text-[#3a525d] uppercase tracking-tight">Processing</h4>
            <p className="text-xs font-semibold text-zinc-500 leading-relaxed">The system will generate <span className="text-[#f2994a]">Secure Member Accounts</span> for all entries. Login credentials will be finalized upon import.</p>
         </div>
      </div>
    </div>
  );
};
