'use client';

import { useState, useEffect } from 'react';

export type ItemType = 'readymades' | 'fabrics' | 'trims' | 'accessories';

export interface ItemPermissions {
  user: any | null;
  role: string;
  permissions: string[];
  isAdmin: boolean;
  canEdit: boolean;
  canViewDetails: boolean;
}

export function useItemPermissions(itemType: ItemType): ItemPermissions {
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
    }
  }, []);

  const role = user?.role || '';
  const roleLower = role.toLowerCase();
  const permissions: string[] = Array.isArray(user?.permissions) ? user.permissions : [];

  const isAdmin =
    roleLower === 'admin' ||
    roleLower === 'super admin' ||
    roleLower === 'superadmin' ||
    permissions.includes('all') ||
    permissions.includes('manage_system');

  let canEdit = false;
  let canViewDetails = false;

  if (isAdmin) {
    canEdit = true;
    canViewDetails = true;
  } else if (itemType === 'readymades') {
    canEdit = permissions.includes('manage_products');
    canViewDetails = permissions.includes('view_products') || permissions.includes('manage_products');
  } else if (itemType === 'fabrics' || itemType === 'trims') {
    canEdit = permissions.includes('manage_inventory') || permissions.includes('manage_products');
    canViewDetails =
      permissions.includes('view_inventory') ||
      permissions.includes('manage_inventory') ||
      permissions.includes('view_products') ||
      permissions.includes('manage_products');
  } else if (itemType === 'accessories') {
    canEdit = permissions.includes('manage_inventory') || permissions.includes('manage_products');
    canViewDetails =
      permissions.includes('view_inventory') ||
      permissions.includes('manage_inventory') ||
      permissions.includes('view_products') ||
      permissions.includes('manage_products');
  }

  return {
    user,
    role,
    permissions,
    isAdmin,
    canEdit,
    canViewDetails,
  };
}
