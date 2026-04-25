'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Shield, ShieldCheck, ShieldAlert, Plus, Edit2, Trash2, X, Check, Save } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

const AVAILABLE_PERMISSIONS = [
  { id: 'all', label: 'Super Admin Access (All Control)', category: 'System' },
  { id: 'manage_system', label: 'Manage System Settings', category: 'System' },
  { id: 'view_audit_logs', label: 'View System Audit Logs', category: 'System' },
  { id: 'view_students', label: 'View Student Registry', category: 'Registry' },
  { id: 'register_students', label: 'Register New Students', category: 'Registry' },
  { id: 'view_employees', label: 'View Staff Registry', category: 'Registry' },
  { id: 'manage_employees', label: 'Manage Staff Members', category: 'Registry' },
  { id: 'manage_measurements', label: 'Execute/Record Measurements', category: 'Production' },
  { id: 'view_measurements', label: 'View Measurement History', category: 'Production' },
  { id: 'view_schools', label: 'View Schools/Orgs', category: 'Registry' },
  { id: 'manage_schools', label: 'Manage Schools/Orgs', category: 'Registry' },
  { id: 'view_inventory', label: 'View Inventory Status', category: 'Inventory' },
  { id: 'manage_inventory', label: 'Manage Stock/Inventory', category: 'Inventory' },
  { id: 'view_products', label: 'View Product Catalog', category: 'Catalog' },
  { id: 'manage_products', label: 'Manage Product Catalog', category: 'Catalog' },
  { id: 'view_size_charts', label: 'View Size Charts', category: 'Catalog' },
  { id: 'manage_size_charts', label: 'Manage Size Charts', category: 'Catalog' },
  { id: 'manage_industries', label: 'Manage Industry Sectors', category: 'Config' },
  { id: 'manage_departments', label: 'Manage Departments', category: 'Config' },
];

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: '', permissions: [] as string[] });

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/user/types');
      setRoles(res.data);
    } catch (err) {
      toast.error('Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const openModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({ name: role.name, permissions: role.permissions || [] });
    } else {
      setEditingRole(null);
      setFormData({ name: '', permissions: [] });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error('Role name is required');

    const loadingToast = toast.loading(editingRole ? 'Updating role...' : 'Creating role...');
    try {
      if (editingRole) {
        await api.put(`/user/types/${editingRole.id}`, formData);
        toast.success('Role updated successfully', { id: loadingToast });
      } else {
        await api.post('/user/types', formData);
        toast.success('Role created successfully', { id: loadingToast });
      }
      setIsModalOpen(false);
      fetchRoles();
    } catch (err) {
      toast.error('Action failed', { id: loadingToast });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role? This might affect existing users.')) return;
    try {
      await api.delete(`/user/types/${id}`);
      toast.success('Role deleted successfully');
      fetchRoles();
    } catch (err) {
      toast.error('Failed to delete role');
    }
  };

  const togglePermission = (id: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(id)
        ? prev.permissions.filter(p => p !== id)
        : [...prev.permissions, id]
    }));
  };

  const toggleCategory = (category: string) => {
    const categoryPerms = AVAILABLE_PERMISSIONS.filter(p => p.category === category).map(p => p.id);
    const hasAll = categoryPerms.every(id => formData.permissions.includes(id));
    
    if (hasAll) {
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(id => !categoryPerms.includes(id))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: Array.from(new Set([...prev.permissions, ...categoryPerms]))
      }));
    }
  };

  const columns: Column<Role>[] = [
    {
      header: 'Role Identity',
      accessor: (r) => (
        <div className="flex items-center gap-4 py-2">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
             r.name === 'Admin' ? 'bg-[#3a525d] text-white' : 'bg-[#2d8d9b]/10 text-[#2d8d9b]'
          }`}>
            {r.name === 'Admin' ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
          </div>
          <div>
            <p className="font-black text-[13px] tracking-tight text-[#3a525d] uppercase">{r.name}</p>
            <p className="text-[9px] text-[#2d8d9b] font-black uppercase tracking-widest mt-1 opacity-70">
               {r.permissions.includes('all') ? 'Universal Access' : `${r.permissions.length} Granular Permissions`}
            </p>
          </div>
        </div>
      ),
    },
    {
        header: 'Primary Access Scope',
        accessor: (r) => (
          <div className="flex flex-wrap gap-1.5 py-2 max-w-[400px]">
             {r.permissions.slice(0, 3).map(p => (
               <span key={p} className="text-[8px] font-black uppercase tracking-widest bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-md text-zinc-500">
                  {p.replace(/_/g, ' ')}
               </span>
             ))}
             {r.permissions.length > 3 && (
               <span className="text-[8px] font-black bg-[#2d8d9b]/10 text-[#2d8d9b] px-2 py-1 rounded-md uppercase">
                  +{r.permissions.length - 3} More
               </span>
             )}
             {r.permissions.length === 0 && <span className="text-[8px] font-bold text-zinc-300 italic">No Permissions Defined</span>}
          </div>
        )
    },
    {
      header: 'Actions',
      accessor: (r) => (
        <div className="flex gap-2 justify-end">
          <button 
            onClick={() => openModal(r)}
            className="p-2.5 bg-zinc-50 hover:bg-[#2d8d9b] hover:text-white transition-all rounded-xl text-zinc-400 group"
            title="Edit Role"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => handleDelete(r.id)}
            className="p-2.5 bg-zinc-50 hover:bg-error hover:text-white transition-all rounded-xl text-zinc-400 group"
            title="Delete Role"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm overflow-hidden relative group">
        <div className="absolute right-0 top-0 w-64 h-64 bg-[#2d8d9b]/5 rounded-full -mr-32 -mt-32 transition-all group-hover:scale-110" />
        <div className="relative">
           <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-3 leading-none">Security Architecture</p>
           <h1 className="text-4xl font-black text-[#3a525d] tracking-tighter italic">Role Management</h1>
        </div>
        <button 
          onClick={() => openModal()}
          className="relative px-8 py-4 bg-[#2d8d9b] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#2d8d9b]/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
        >
          <Plus size={18} strokeWidth={3} />
          Define New Role
        </button>
      </div>

      <DataTable 
        title="Active System Roles"
        subtitle="Configure granular access control for all internal and external user types"
        columns={columns}
        data={roles}
        isLoading={isLoading}
      />

      {/* Role Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md transition-opacity" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-8 bg-[#3a525d] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                   <Shield size={28} />
                </div>
                <div>
                   <h2 className="text-2xl font-black italic tracking-tighter leading-none">
                      {editingRole ? 'Refine Role Identity' : 'Define New System Role'}
                   </h2>
                   <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mt-2">
                      Access Control Policy Configuration Center
                   </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-10 flex-1 overflow-y-auto space-y-10 custom-scrollbar">
               {/* Role Name Input */}
               <div className="space-y-4">
                  <div className="flex items-center gap-3">
                     <div className="w-1.5 h-6 bg-[#2d8d9b] rounded-full" />
                     <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#3a525d]">Fundamental Identity</h4>
                  </div>
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter role name (e.g. Inventory Manager)"
                    className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-[1.5rem] font-bold text-lg text-[#3a525d] focus:outline-none focus:ring-4 focus:ring-[#2d8d9b]/10 focus:border-[#2d8d9b] transition-all"
                  />
               </div>

               {/* Permissions Matrix */}
               <div className="space-y-8">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-[#f2994a] rounded-full" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#3a525d]">Permission Matrix</h4>
                     </div>
                     <p className="text-[9px] font-black text-[#2d8d9b] uppercase tracking-widest">{formData.permissions.length} Active Rules</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {Array.from(new Set(AVAILABLE_PERMISSIONS.map(p => p.category))).map(category => (
                       <div key={category} className="space-y-4">
                          <div className="flex items-center justify-between bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100">
                             <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 font-mono">{category} Module</h5>
                             <button 
                               onClick={() => toggleCategory(category)}
                               className="text-[8px] font-black uppercase text-[#2d8d9b] hover:underline"
                             >
                                Toggle All
                             </button>
                          </div>
                          <div className="space-y-2 pl-2">
                             {AVAILABLE_PERMISSIONS.filter(p => p.category === category).map(permission => (
                               <label 
                                 key={permission.id}
                                 className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${
                                   formData.permissions.includes(permission.id)
                                    ? 'bg-[#2d8d9b]/5 border-[#2d8d9b]/30'
                                    : 'bg-white border-zinc-100 hover:border-zinc-200'
                                 }`}
                               >
                                 <div className="flex flex-col gap-1">
                                    <span className={`text-[11px] font-black transition-colors ${
                                      formData.permissions.includes(permission.id) ? 'text-[#2d8d9b]' : 'text-zinc-500'
                                    }`}>
                                      {permission.label}
                                    </span>
                                    <span className="text-[8px] font-bold text-zinc-300 uppercase tracking-tighter">Key: {permission.id}</span>
                                 </div>
                                 <input 
                                   type="checkbox"
                                   checked={formData.permissions.includes(permission.id)}
                                   onChange={() => togglePermission(permission.id)}
                                   className="w-5 h-5 rounded-lg border-2 border-zinc-200 text-[#2d8d9b] focus:ring-[#2d8d9b] transition-all accent-[#2d8d9b]"
                                 />
                               </label>
                             ))}
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-4 shrink-0">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-zinc-400 hover:bg-zinc-100 transition-all border border-zinc-200"
              >
                Cancel Changes
              </button>
              <button 
                onClick={handleSubmit}
                className="px-10 py-3 bg-[#3a525d] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#3a525d]/20 flex items-center gap-3"
              >
                <Save size={16} strokeWidth={3} />
                Deploy Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e4e4e7;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d4d4d8;
        }
      `}</style>
    </div>
  );
}
