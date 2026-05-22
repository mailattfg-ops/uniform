'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Plus, Building2, MapPin, Edit2, Trash2, X, Check, Users, School, Calendar, Key, Grid, Eye, ChevronDown } from 'lucide-react';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CredentialsModal } from '@/components/ui/CredentialsModal';

interface Organization {
  id: number;
  name: string;
  address: string;
  industry_id: number;
  industries?: { name: string };
  created_at: string;
}

interface Industry {
  id: number;
  name: string;
}

export default function OrganizationsRegistry() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });
  const [credsModal, setCredsModal] = useState<{ isOpen: boolean; data: any | null }>({
    isOpen: false,
    data: null
  });
  const [viewingOrg, setViewingOrg] = useState<Organization | null>(null);
  const [orgDetails, setOrgDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assignedStaff, setAssignedStaff] = useState<any[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [orgsRes, indRes, empRes] = await Promise.all([
        api.get('/organizations'),
        api.get('/industries'),
        api.get('/employees')
      ]);
      setOrganizations(orgsRes.data);
      setIndustries(indRes.data);
      setEmployees(empRes.data);
    } catch (err) {
      toast.error('Failed to load registry data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewDetails = async (org: Organization) => {
    setViewingOrg(org);
    setIsLoadingDetails(true);
    try {
      const [detailsRes, staffRes] = await Promise.all([
        api.get(`/organizations/${org.id}/details`),
        api.get(`/organizations/${org.id}/staff`)
      ]);
      setOrgDetails(detailsRes.data);
      
      const assigned = staffRes.data.data || [];
      setAssignedStaff(assigned);
      setSelectedStaffIds(assigned.map((s: any) => s.employee_id));
    } catch (err) {
      toast.error('Failed to load organization details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSaveStaff = async () => {
    if (!viewingOrg) return;
    setIsAssigning(true);
    const loadingToast = toast.loading('Updating staff assignments...');
    try {
      await api.post(`/organizations/${viewingOrg.id}/staff`, { employee_ids: selectedStaffIds });
      toast.success('Staff assignments updated successfully!', { id: loadingToast });
      setIsDropdownOpen(false);
    } catch (err) {
      toast.error('Failed to update staff assignments', { id: loadingToast });
    } finally {
      setIsAssigning(false);
    }
  };

  const toggleStaffSelection = (id: number) => {
    setSelectedStaffIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const generateInitialPassword = () => Math.random().toString(36).slice(-6).toUpperCase();

  const orgFields: FormField[] = [
    { 
      name: 'name', 
      label: 'Organization Name', 
      type: 'text', 
      placeholder: 'Only letters allowed', 
      required: true, 
      pattern: "[a-zA-Z\\s]*",
      defaultValue: editingOrg?.name 
    },
    { 
      name: 'industry_id', 
      label: 'Industry Sector', 
      type: 'select', 
      options: industries.map(i => ({ label: i.name, value: String(i.id) })),
      required: true, 
      defaultValue: editingOrg?.industry_id ? String(editingOrg.industry_id) : undefined
    },
    { 
      name: 'address', 
      label: 'Full Address', 
      type: 'text', 
      placeholder: 'Street, City, Country', 
      maxLength: 200,
      defaultValue: editingOrg?.address 
    },
    ...(!editingOrg ? [
      { name: 'username', label: 'Admin Username', type: 'text' as const, placeholder: 'Max 20 chars', required: true, maxLength: 20 }
    ] : [])
  ];

  const handleAddOrUpdate = async (formData: any) => {
    const loadingToast = toast.loading(editingOrg ? 'Updating organization...' : 'Registering organization...');
    try {
      if (editingOrg) {
        await api.put(`/organizations/${editingOrg.id}`, formData);
        toast.success('Organization updated successfully!', { id: loadingToast });
      } else {
        // Auto-generate password for new organization
        const autoPassword = generateInitialPassword();
        const submissionData = { ...formData, password: autoPassword };
        
        const response = await api.post('/organizations', submissionData);
        toast.success('Organization registered successfully!', { id: loadingToast });
        
        setCredsModal({
          isOpen: true,
          data: {
            full_name: formData.name,
            username: formData.username,
            password: autoPassword
          }
        });
      }
      setIsAdding(false);
      setEditingOrg(null);
      fetchData();
    } catch (err) {
      toast.error('Operation failed', { id: loadingToast });
    }
  };

  const handleConfirmedDelete = async () => {
    if (!deleteConfirm.id) return;
    
    const loadingToast = toast.loading('Purging record...');
    setDeleteConfirm({ isOpen: false, id: null });
    try {
      await api.delete(`/organizations/${deleteConfirm.id}`);
      toast.success('Record and all linked data removed', { id: loadingToast });
      fetchData();
    } catch (err) {
      toast.error('Failed to delete organization', { id: loadingToast });
    }
  };

  const handleResetPassword = async (org: Organization) => {
    const loadingToast = toast.loading('Generating secure access key...');
    try {
      const response = await api.post(`/organizations/${org.id}/reset-password`);
      const { newPassword, username } = response.data;
      
      toast.success('Credentials Reset Successfully!', { id: loadingToast });
      
      setCredsModal({
        isOpen: true,
        data: {
          full_name: org.name,
          username: username,
          password: newPassword
        }
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reset password', { id: loadingToast });
    }
  };

  const columns: Column<Organization>[] = [
    {
      header: 'Organization Details',
      accessor: (o) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#3a525d]/5 rounded-2xl flex items-center justify-center text-[#3a525d]">
            <Building2 size={24} />
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{o.name}</p>
            <div className="flex items-center gap-2 mt-1">
               <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">ID: #{o.id}</p>
               <span className="w-1 h-1 rounded-full bg-zinc-300" />
               <p className="text-[9px] font-black text-[#2d8d9b] uppercase tracking-widest">{o.industries?.name || 'School'}</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Location',
      accessor: (o) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin size={14} className="text-[#2d8d9b]" />
          <span className="text-xs font-semibold truncate max-w-[200px]">{o.address || 'Location not set'}</span>
        </div>
      )
    },
    {
      header: 'System Log',
      accessor: (o) => (
          <div className="flex flex-col">
              <span className="text-xs font-black text-[#3a525d]">
                  {o.created_at ? new Date(o.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
              </span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Registered Date</span>
          </div>
      )
    },
    {
      header: 'Actions',
      accessor: (o) => (
        <div className="flex items-center gap-3">
          <Button
            onClick={() => handleViewDetails(o)}
            variant="secondary"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all shadow-sm p-0"
            title="View Details"
          >
            <Eye size={16} />
          </Button>
          <Button
            onClick={() => {
                setEditingOrg(o);
                setIsAdding(true);
            }}
            variant="secondary"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 hover:bg-[#2d8d9b] hover:text-white transition-all shadow-sm p-0"
          >
            <Edit2 size={16} />
          </Button>
          <Button
            onClick={() => handleResetPassword(o)}
            variant="secondary"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#f2994a]/10 text-[#f2994a] border border-[#f2994a]/20 hover:bg-[#f2994a] hover:text-white transition-all shadow-sm p-0"
          >
            <Key size={16} />
          </Button>
          <Button
            onClick={() => setDeleteConfirm({ isOpen: true, id: o.id })}
            variant="secondary"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-error/10 text-error border border-error/20 hover:bg-error hover:text-white transition-all shadow-sm p-0"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  if (isAdding) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <DynamicForm 
          title={editingOrg ? "Edit Organization" : "Register New Organization"}
          subtitle={editingOrg ? `Update profile for ${editingOrg.name}` : "Configure a new industry organization"}
          fields={orgFields}
          onSubmit={handleAddOrUpdate}
          onCancel={() => {
              setIsAdding(false);
              setEditingOrg(null);
          }}
          submitLabel={editingOrg ? "Save Changes" : "Register Organization"}
          columns={1}
        />
      </div>
    );
  }

  const latestOrg = organizations.length > 0 ? organizations[0] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-zinc-100 flex items-center justify-between group hover:shadow-xl hover:shadow-[#3a525d]/5 transition-all duration-500">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">Total Organizations</p>
            <h3 className="text-4xl font-black text-[#3a525d] tracking-tighter">{organizations.length}</h3>
            <p className="text-[10px] font-bold text-green-600 mt-2 uppercase flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-green-500" />
              Global Registry
            </p>
          </div>
          <div className="w-16 h-16 bg-[#3a525d]/5 rounded-3xl flex items-center justify-center text-[#3a525d] group-hover:scale-110 group-hover:bg-[#3a525d] group-hover:text-white transition-all duration-500">
            <Building2 size={32} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-zinc-100 flex items-center justify-between group hover:shadow-xl hover:shadow-[#2d8d9b]/5 transition-all duration-500">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">Sectors Covered</p>
            <h3 className="text-4xl font-black text-[#2d8d9b] tracking-tighter">{industries.length}</h3>
            <p className="text-[10px] font-bold text-blue-600 mt-2 uppercase flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-blue-500" />
              Active Industries
            </p>
          </div>
          <div className="w-16 h-16 bg-[#2d8d9b]/5 rounded-3xl flex items-center justify-center text-[#2d8d9b] group-hover:scale-110 group-hover:bg-[#2d8d9b] group-hover:text-white transition-all duration-500">
            <Grid size={32} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-zinc-100 flex items-center justify-between group hover:shadow-xl hover:shadow-[#f2994a]/5 transition-all duration-500">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">Recent Onboarding</p>
            <h3 className="text-xl font-black text-[#3a525d] tracking-tight truncate max-w-[180px]">
              {latestOrg ? latestOrg.name : 'No Entries'}
            </h3>
            <p className="text-[10px] font-bold text-[#f2994a] mt-2 uppercase flex items-center gap-1">
              <Calendar size={10} />
              {latestOrg ? new Date(latestOrg.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div className="w-16 h-16 bg-[#f2994a]/5 rounded-3xl flex items-center justify-center text-[#f2994a] group-hover:scale-110 group-hover:bg-[#f2994a] group-hover:text-white transition-all duration-500">
            <Building2 size={32} />
          </div>
        </div>
      </div>

      <DataTable 
        title="Organizations Registry"
        subtitle="Manage all multi-industry partners and sectors"
        columns={columns}
        data={organizations}
        isLoading={isLoading}
        searchPlaceholder="Search by name, ID or industry..."
        headerAction={
          <Button 
            onClick={() => setIsAdding(true)}
            className="h-12 px-8 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-[#3a525d]/20 gap-3"
          >
            <Plus size={16} strokeWidth={3} />
            Register Organization
          </Button>
        }
      />

      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title="De-Register Organization?"
        message="This will remove the organization and all linked departments and member records. This action cannot be reversed."
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        confirmLabel="Confirm De-Registration"
        variant="danger"
      />

      <CredentialsModal 
        isOpen={credsModal.isOpen}
        onClose={() => setCredsModal({ isOpen: false, data: null })}
        data={credsModal.data}
      />

      {/* View Organization Modal */}
      {viewingOrg && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setViewingOrg(null)} />
          
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden relative animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="bg-[#3a525d] p-8 text-white">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                   <Building2 size={24} />
                </div>
                <Button variant="secondary" onClick={() => setViewingOrg(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors bg-transparent border-none shadow-none text-white">
                  <X size={20} />
                </Button>
              </div>
              <h3 className="text-2xl font-black italic">{viewingOrg.name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">ID: #{viewingOrg.id}</p>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{viewingOrg.industries?.name || 'Unknown Industry'}</p>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Organization Info */}
              <div className="grid grid-cols-2 gap-6">
                 <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <label className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                      <MapPin size={12} />
                      Location Address
                    </label>
                    <p className="text-sm font-semibold text-[#3a525d]">{viewingOrg.address || 'Address not provided'}</p>
                 </div>
                 
                 <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <label className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                      <Calendar size={12} />
                      Registration Date
                    </label>
                    <p className="text-sm font-semibold text-[#3a525d]">
                      {viewingOrg.created_at ? new Date(viewingOrg.created_at).toLocaleString(undefined, {
                        dateStyle: 'long',
                        timeStyle: 'short'
                      }) : 'N/A'}
                    </p>
                 </div>
              </div>

              {/* Advanced Details */}
              {isLoadingDetails ? (
                <div className="flex items-center justify-center p-8">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d8d9b]"></div>
                </div>
              ) : orgDetails ? (
                <div className="space-y-8">
                  {/* Departments */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                       <Grid size={14} /> Departments ({orgDetails.departments?.length || 0})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                       {orgDetails.departments?.length > 0 ? (
                         orgDetails.departments.map((dept: any) => (
                           <div key={dept.id} className="px-4 py-2 bg-[#2d8d9b]/10 text-[#2d8d9b] rounded-xl text-xs font-bold border border-[#2d8d9b]/20">
                             {dept.name} {dept.section ? `(${dept.section})` : ''}
                           </div>
                         ))
                       ) : (
                         <p className="text-xs font-medium text-zinc-400">No departments found.</p>
                       )}
                    </div>
                  </div>

                  {/* Measurement Status */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                       <Users size={14} /> Measurement Status
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                       <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 text-center">
                          <p className="text-2xl font-black text-[#3a525d]">{orgDetails.measurements?.total || 0}</p>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mt-1">Total Members</p>
                       </div>
                       <div className="p-4 bg-green-50 rounded-2xl border border-green-100 text-center">
                          <p className="text-2xl font-black text-green-600">{orgDetails.measurements?.completed || 0}</p>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-green-500 mt-1">Completed</p>
                       </div>
                       <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-center">
                          <p className="text-2xl font-black text-orange-500">{orgDetails.measurements?.pending || 0}</p>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-orange-400 mt-1">Pending</p>
                       </div>
                    </div>
                  </div>

                  {/* Staff Assignment */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                       <School size={14} /> Assigned Measurement Staff
                    </h4>
                    <div className="flex gap-3 items-start relative">
                       <div className="flex-1 relative">
                          <Button
                            variant="secondary"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full h-12 rounded-2xl border border-zinc-200 px-4 text-sm font-semibold text-[#3a525d] bg-white flex items-center justify-between hover:border-[#2d8d9b] transition-colors shadow-none"
                          >
                            <span className="truncate">
                               {selectedStaffIds.length === 0 
                                  ? 'Select Staff Members...' 
                                  : `${selectedStaffIds.length} staff member(s) selected`}
                            </span>
                            <ChevronDown size={16} className={`text-zinc-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                          </Button>
                          
                          {/* Custom Dropdown */}
                          {isDropdownOpen && (
                             <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-zinc-100 p-2 z-50 max-h-60 overflow-y-auto custom-scrollbar">
                                {employees.map(emp => {
                                  const isSelected = selectedStaffIds.includes(emp.id);
                                  return (
                                    <div 
                                      key={emp.id} 
                                      onClick={() => toggleStaffSelection(emp.id)}
                                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors"
                                    >
                                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${isSelected ? 'bg-[#2d8d9b] border-[#2d8d9b] text-white' : 'border-zinc-300'}`}>
                                        {isSelected && <Check size={12} strokeWidth={4} />}
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold text-[#3a525d]">{emp.full_name}</p>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{emp.employee_id} • {emp.department}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                                {employees.length === 0 && (
                                  <div className="p-4 text-center text-sm font-medium text-zinc-400">No employees found</div>
                                )}
                             </div>
                          )}
                       </div>
                       <Button 
                         onClick={handleSaveStaff}
                         disabled={isAssigning}
                         className="h-12 px-8 bg-[#2d8d9b] hover:bg-[#3a525d] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] whitespace-nowrap"
                       >
                         {isAssigning ? 'Updating...' : 'Save Staff'}
                       </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end pt-6 border-t border-zinc-100">
                <Button variant="outline" onClick={() => setViewingOrg(null)} className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest text-zinc-400">
                   Close Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
