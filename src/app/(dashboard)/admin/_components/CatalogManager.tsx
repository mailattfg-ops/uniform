'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { DynamicForm } from '@/components/ui/DynamicForm';
import { Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Item {
  id: string;
  code: string;
  name: string;
}

interface CatalogManagerProps {
  type: 'fabrics' | 'buttons' | 'threads';
  title: string;
  subtitle: string;
}

export default function CatalogManager({ type, title, subtitle }: CatalogManagerProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/inventory/${type}`);
      setItems(response.data);
    } catch (err) {
      toast.error(`Failed to load ${type}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [type]);

  const handleSubmit = async (data: any) => {
    const loadingToast = toast.loading(editingItem ? 'Updating...' : 'Adding...');
    try {
      if (editingItem) {
        await api.put(`/inventory/${type}/${editingItem.id}`, data);
        toast.success(`${title} updated`, { id: loadingToast });
      } else {
        await api.post(`/inventory/${type}`, data);
        toast.success(`${title} added`, { id: loadingToast });
      }
      setView('list');
      setEditingItem(null);
      fetchItems();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed', { id: loadingToast });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await api.delete(`/inventory/${type}/${deleteConfirm.id}`);
      toast.success('Deleted successfully');
      setDeleteConfirm({ isOpen: false, id: null });
      fetchItems();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const columns: Column<Item>[] = [
    { header: 'Code', accessor: 'code', className: 'font-black text-[#2d8d9b]' },
    { header: 'Name', accessor: 'name' },
    {
      header: 'Actions',
      accessor: (item) => (
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setEditingItem(item);
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
            setEditingItem(null);
          }}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] hover:text-[#3a525d] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to List
        </button>
        
        <div className="max-w-2xl mx-auto">
          <DynamicForm 
            title={editingItem ? `Edit ${title}` : `Add New ${title}`}
            fields={[
              { name: 'code', label: 'Item Code', type: 'text', required: true, defaultValue: editingItem?.code, allowSpecialCharacters: true },
              { name: 'name', label: 'Item Name', type: 'text', required: true, defaultValue: editingItem?.name },
            ]}
            onSubmit={handleSubmit}
            onCancel={() => {
              setView('list');
              setEditingItem(null);
            }}
            submitLabel={editingItem ? 'Update' : 'Add Item'}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <DataTable 
        title={title}
        subtitle={subtitle}
        columns={columns}
        data={items}
        isLoading={isLoading}
        headerAction={
          <Button 
            onClick={() => setView('add')}
            className="gap-2 text-[10px] rounded-2xl h-11 uppercase font-black tracking-[0.2em] px-6 bg-[#3a525d] hover:bg-[#2d8d9b] text-white border-none shadow-lg shadow-[#3a525d]/20"
          >
            <Plus size={14} strokeWidth={3} />
            Add {title}
          </Button>
        }
      />

      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title={`Delete ${title}?`}
        message="This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        variant="danger"
      />
    </>
  );
}
