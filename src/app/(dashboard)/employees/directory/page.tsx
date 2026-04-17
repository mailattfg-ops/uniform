'use client';

import React, { useState } from 'react';
import { EmployeeTable } from '../_components/EmployeeTable';
import { EmployeeRegisterForm } from '../_components/EmployeeRegisterForm';

export default function EmployeeDirectoryPage() {
  const [view, setView] = useState<'list' | 'register' | 'edit'>('list');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const handleRegister = () => setView('register');
  
  const handleEdit = (employee: any) => {
    setSelectedEmployee(employee);
    setView('edit');
  };

  const handleSuccess = () => {
    setView('list');
    setSelectedEmployee(null);
  };

  const renderView = () => {
    switch (view) {
      case 'list':
        return (
          <EmployeeTable 
            onRegister={handleRegister} 
            onEdit={handleEdit} 
          />
        );
      case 'register':
        return (
          <EmployeeRegisterForm 
            onCancel={() => setView('list')} 
            onSuccess={handleSuccess} 
          />
        );
      case 'edit':
        return (
          <EmployeeRegisterForm 
            initialData={selectedEmployee}
            onCancel={() => setView('list')} 
            onSuccess={handleSuccess} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      {renderView()}
    </div>
  );
}
