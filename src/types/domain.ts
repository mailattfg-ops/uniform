/**
 * Forma Apparels — Core Domain Types & Contracts
 */

export interface OrganizationInfo {
  id: number;
  name: string;
  code?: string;
  address?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
}

export interface SizeBreakdown {
  design_number?: string;
  fabric_id?: string | number;
  fabric_name?: string;
  main_fabric_meters?: number | string;
  button_id?: string | number;
  thread_id?: string | number;
  sizes?: Record<string, number>;
  total_quantity?: number;
  remarks?: string;
}

export interface ProductTypeInfo {
  id: number;
  name: string;
  code?: string;
}

export interface QuotationLineItem {
  id: number;
  quotation_id: number;
  product_type_id?: number;
  product_type_name?: string;
  product_types?: ProductTypeInfo;
  design_number?: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
  size_breakdown?: SizeBreakdown;
  hsn_code?: string;
  tax_rate?: number;
}

export interface SalesOrderSummary {
  id: number;
  order_no: string;
  quotation_id: number;
  branch_id?: number;
  status: OrderStatus;
  corporate_action?: string;
  total_amount?: number;
  paid_amount?: number;
  created_at: string;
  organizations?: OrganizationInfo;
  quotations?: {
    id: number;
    quotation_no: string;
    title: string;
    final_quote_value?: number;
    paid_amount?: number;
    organizations?: OrganizationInfo;
    quotation_items?: QuotationLineItem[];
  };
}

export type OrderStatus =
  | 'Draft'
  | 'Held at Branch'
  | 'Approval Pending'
  | 'Corporate Accepted'
  | 'Corporate Rejected'
  | 'Corporate Hold'
  | 'Placed'
  | 'In Production'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface UserIdentity {
  id: string | number;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
  branchId?: number;
  branchName?: string;
  branchTier?: string;
  branchCode?: string;
  organizationId?: number;
}
