'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { DynamicForm } from '@/components/ui/DynamicForm';
import { Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Design {
  id: string;
  design_code: string;
  main_fabric_id: string;
  attachment_fabric1_id: string;
  attachment_fabric2_id: string;
  button_id: string;
  thread_id: string;
  main_fabric?: { name: string };
  attachment_fabric1?: { name: string };
  attachment_fabric2?: { name: string };
  buttons?: { name: string };
  threads?: { name: string };
}

export default function DesignManager() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [catalogs, setCatalogs] = useState<{
    fabrics: any[],
    buttons: any[],
    threads: any[]
  }>({ fabrics: [], buttons: [], threads: [] });
  
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  const [editingDesign, setEditingDesign] = useState<Design | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [designRes, fabricRes, buttonRes, threadRes] = await Promise.all([
        api.get('/inventory/designs'),
        api.get('/inventory/fabrics'),
        api.get('/inventory/buttons'),
        api.get('/inventory/threads')
      ]);
      setDesigns(designRes.data);
      setCatalogs({
        fabrics: fabricRes.data.map((f: any) => ({ label: f.name, value: f.id })),
        buttons: buttonRes.data.map((b: any) => ({ label: b.name, value: b.id })),
        threads: threadRes.data.map((t: any) => ({ label: t.name, value: t.id }))
      });
    } catch (err) {
      toast.error('Failed to load design hub data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (data: any) => {
    const loadingToast = toast.loading(editingDesign ? 'Updating Design...' : 'Creating Design...');
    try {
      if (editingDesign) {
        await api.put(`/inventory/designs/${editingDesign.id}`, data);
        toast.success('Design updated', { id: loadingToast });
      } else {
        await api.post('/inventory/designs', data);
        toast.success('Design created', { id: loadingToast });
      }
      setView('list');
      setEditingDesign(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed', { id: loadingToast });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await api.delete(`/inventory/designs/${deleteConfirm.id}`);
      toast.success('Design removed');
      setDeleteConfirm({ isOpen: false, id: null });
      fetchData();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const columns: Column<Design>[] = [
    { header: 'Design No', accessor: 'design_code', className: 'font-black text-[#2d8d9b]' },
    { 
      header: 'Fabrics', 
      accessor: (d) => (
        <div className="space-y-1">
          <p className="text-xs font-bold"><span className="opacity-50">Main:</span> {d.main_fabric?.name || '---'}</p>
          {(d.attachment_fabric1 || d.attachment_fabric2) && (
            <p className="text-[10px] opacity-60">
              Attachments: {[d.attachment_fabric1?.name, d.attachment_fabric2?.name].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      )
    },
    { header: 'Buttons', accessor: (d) => d.buttons?.name || '---' },
    { header: 'Thread', accessor: (d) => d.threads?.name || '---' },
    {
      header: 'Actions',
      accessor: (item) => (
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setEditingDesign(item);
              setView('edit');
            }}
            className="p-2 h-9 w-9 flex items-center justify-center rounded-lg bg-[#2d8d9b]/10 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all shadow-sm"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => setDeleteConfirm({ isOpen: true, id: item.id })}
            className="p-2 h-9 w-9 flex items-center justify-center rounded-lg bg-error/10 text-error hover:bg-error hover:text-white transition-all shadow-sm"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
      className: 'w-32',
    }
  ];

  if (view !== 'list') {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => {
            setView('list');
            setEditingDesign(null);
          }}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] hover:text-[#3a525d] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Hub
        </button>
        
        <div className="max-w-4xl mx-auto">
          <DynamicForm 
            title={editingDesign ? `Edit Design ${editingDesign.design_code}` : 'Register New Design No'}
            fields={[
              { name: 'design_code', label: 'Design Code', type: 'text', required: true, defaultValue: editingDesign?.design_code, allowSpecialCharacters: true },
              { name: 'main_fabric_id', label: 'Main Fabric', type: 'select', options: catalogs.fabrics, required: true, defaultValue: editingDesign?.main_fabric_id },
              { name: 'attachment_fabric1_id', label: 'Attachment Fabric 1', type: 'select', options: catalogs.fabrics, defaultValue: editingDesign?.attachment_fabric1_id },
              { name: 'attachment_fabric2_id', label: 'Attachment Fabric 2', type: 'select', options: catalogs.fabrics, defaultValue: editingDesign?.attachment_fabric2_id },
              { name: 'button_id', label: 'Buttons Selection', type: 'select', options: catalogs.buttons, required: true, defaultValue: editingDesign?.button_id },
              { name: 'thread_id', label: 'Thread Colour', type: 'select', options: catalogs.threads, required: true, defaultValue: editingDesign?.thread_id },
            ]}
            onSubmit={handleSubmit}
            onCancel={() => {
              setView('list');
              setEditingDesign(null);
            }}
            submitLabel={editingDesign ? 'Save Changes' : 'Create Design'}
            columns={2}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <DataTable 
        title="Design Hub"
        subtitle="Technical Specifications Registry"
        columns={columns}
        data={designs}
        isLoading={isLoading}
        headerAction={
          <Button 
            onClick={() => setView('add')}
            className="gap-2 text-[10px] rounded-2xl h-11 uppercase font-black tracking-[0.2em] px-6 bg-[#3a525d] hover:bg-[#2d8d9b] text-white border-none shadow-lg shadow-[#3a525d]/20"
          >
            <Plus size={14} strokeWidth={3} />
            Create Design
          </Button>
        }
      />

      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title="Delete Design Specification?"
        message="This will remove the link between these technical specifications. This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        variant="danger"
      />
    </>
  );
}
