'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Plus, BookOpen, Trash2, Filter, Edit2 } from 'lucide-react';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ClassRecord {
  id: number;
  name: string;
  school_id: number;
  schools: { name: string };
  created_at: string;
}

export default function ClassManagement() {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRecord | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [schoolsRes, classesRes] = await Promise.all([
        api.get('/schools'),
        api.get('/schools/classes' + (selectedSchool ? `?schoolId=${selectedSchool}` : ''))
      ]);
      setSchools(schoolsRes.data);
      setClasses(classesRes.data);
    } catch (err) {
      toast.error('Failed to load class data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSchool]);

  const classFields: FormField[] = [
    { 
      name: 'schoolId', 
      label: 'Select School', 
      type: 'select', 
      options: schools.map(s => ({ label: s.name, value: s.id })),
      required: true,
      defaultValue: editingClass?.school_id 
    },
    { 
      name: 'name', 
      label: 'Class Name / Grade', 
      type: 'text', 
      placeholder: 'e.g. Grade 5-A', 
      required: true,
      defaultValue: editingClass?.name
    }
  ];

  const handleAddOrUpdate = async (data: any) => {
    const loadingToast = toast.loading(editingClass ? 'Updating class...' : 'Setting up class...');
    try {
      if (editingClass) {
          await api.put(`/schools/classes/${editingClass.id}`, data);
          toast.success('Class updated successfully!', { id: loadingToast });
      } else {
          await api.post('/schools/classes/create', data);
          toast.success('Class created successfully!', { id: loadingToast });
      }
      setIsAdding(false);
      setEditingClass(null);
      fetchData();
    } catch (err) {
      toast.error('Operation failed', { id: loadingToast });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this class?')) return;
    
    const loadingToast = toast.loading('Removing class...');
    try {
      await api.delete(`/schools/classes/${id}`);
      toast.success('Class removed!', { id: loadingToast });
      fetchData();
    } catch (err) {
      toast.error('Failed to delete', { id: loadingToast });
    }
  };

  const columns: Column<ClassRecord>[] = [
    {
      header: 'Class / Grade Name',
      accessor: (c) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#2d8d9b]/5 rounded-xl flex items-center justify-center text-[#2d8d9b]">
            <BookOpen size={20} />
          </div>
          <p className="font-black text-sm tracking-tight text-[#3a525d]">{c.name}</p>
        </div>
      ),
    },
    {
      header: 'Assigned School',
      accessor: (c) => (
        <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#3a525d]">{c.schools?.name}</span>
        </div>
      )
    },
    {
        header: 'Setup Date',
        accessor: (c) => (
            <div className="flex flex-col">
                <span className="text-xs font-black text-zinc-500">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                </span>
            </div>
        )
    },
    {
      header: 'Actions',
      accessor: (c) => (
        <div className="flex items-center gap-3">
          <button 
                onClick={() => {
                    setEditingClass(c);
                    setIsAdding(true);
                }}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 hover:bg-[#2d8d9b] hover:text-white transition-all shadow-sm"
                title="Edit Class"
            >
                <Edit2 size={16} />
            </button>
            <button 
                onClick={() => handleDelete(c.id.toString())}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-error/10 text-error border border-error/20 hover:bg-error hover:text-white transition-all shadow-sm"
                title="Delete Class"
            >
                <Trash2 size={16} />
            </button>
        </div>
      )
    }
  ];

  if (isAdding) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <DynamicForm 
          title={editingClass ? "Edit Class Setup" : "Setup New Class"}
          subtitle={editingClass ? `Modify details for ${editingClass.name}` : "Define a new academic group for a school"}
          fields={classFields}
          onSubmit={handleAddOrUpdate}
          onCancel={() => {
              setIsAdding(false);
              setEditingClass(null);
          }}
          submitLabel={editingClass ? "Update Class" : "Create Class"}
          columns={1}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-sm border border-zinc-100">
          <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="p-3 bg-[#3a525d]/5 rounded-2xl">
                  <Filter size={20} className="text-[#3a525d]" />
              </div>
              <select 
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="bg-zinc-50 border-none text-sm font-bold text-[#3a525d] rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#2d8d9b]/20 min-w-[240px]"
              >
                <option value="">All Schools</option>
                {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
          </div>

          <Button 
            onClick={() => setIsAdding(true)}
            className="h-12 px-8 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-[#3a525d]/20 gap-3 w-full md:w-auto"
          >
            <Plus size={16} strokeWidth={3} />
            Quick Setup Class
          </Button>
      </div>

      <DataTable 
        title="Class Management"
        subtitle="Organize student groups per institution"
        columns={columns}
        data={classes}
        isLoading={isLoading}
        searchPlaceholder="Filter classes..."
      />
    </div>
  );
}
