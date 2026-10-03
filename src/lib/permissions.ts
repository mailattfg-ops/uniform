export interface PermissionItem {
  id: string;
  label: string;
  category: string;
  description: string;
}

export const PERMISSION_CATEGORIES = [
  'System & Security',
  'Customer CRM & Leads',
  'Members & Student Registry',
  'Product Catalog & Designs',
  'Measurements & Sizing',
  'Marketing & Quotations',
  'Sales Orders & Counter POS',
  'Warehouse & Inventory',
  'Purchasing & Suppliers',
  'Factory Operations',
  'Accounts & Finance',
  'Engineering & SAM',
  'Client Portal'
] as const;

export const AVAILABLE_PERMISSIONS: PermissionItem[] = [
  // ── 1. System & Security ──
  { id: 'all', label: 'Super Admin Access (Universal Bypass)', category: 'System & Security', description: 'Universal root control over all system modules, configurations, and data' },
  { id: 'manage_system', label: 'Manage System Settings & Masters', category: 'System & Security', description: 'Configure company profile, bank settings, branches, prefixes, and global rules' },
  { id: 'view_audit_logs', label: 'View System Audit & Activity Logs', category: 'System & Security', description: 'Access audit trails, activity history, and authentication logs' },
  { id: 'manage_roles', label: 'Manage User Roles & Permissions', category: 'System & Security', description: 'Create, update, and assign roles and feature permissions across staff' },
  { id: 'manage_employees', label: 'Manage Staff & System Users', category: 'System & Security', description: 'Create, edit, and assign roles to internal employees and staff' },
  { id: 'view_employees', label: 'View Staff Registry Directory', category: 'System & Security', description: 'View staff members directory and employee profiles' },
  { id: 'manage_branches', label: 'Manage Branches & Outlets', category: 'System & Security', description: 'Configure retail outlets, factories, corporate HQ, and credentials' },

  // ── 2. Customer CRM & Leads ──
  { id: 'view_organizations', label: 'View Organizations & Clients', category: 'Customer CRM & Leads', description: 'Browse corporate client accounts, billing profiles, and contact details' },
  { id: 'manage_schools', label: 'Manage Organizations & Schools', category: 'Customer CRM & Leads', description: 'Register, edit, configure, and onboard client institutions and schools' },
  { id: 'view_schools', label: 'View Schools & Institutions', category: 'Customer CRM & Leads', description: 'Browse school directories, corporate accounts, and client portals' },
  { id: 'view_leads', label: 'View Inward Leads Registry', category: 'Customer CRM & Leads', description: 'Inspect prospective client inquiries and inbound lead records' },
  { id: 'manage_leads', label: 'Manage & Convert Leads', category: 'Customer CRM & Leads', description: 'Create, update, assign, and convert sales leads into customers' },

  // ── 3. Members & Student Registry ──
  { id: 'view_students', label: 'View Student / Member Registry', category: 'Members & Student Registry', description: 'Browse enrolled students, employees, and organization members' },
  { id: 'register_students', label: 'Register New Students / Members', category: 'Members & Student Registry', description: 'Enroll individual students and members into registry' },
  { id: 'manage_students', label: 'Edit & Manage Members / Students', category: 'Members & Student Registry', description: 'Update student profiles, departments, admission info, and details' },
  { id: 'bulk_upload_members', label: 'Bulk Import Members (CSV/Excel)', category: 'Members & Student Registry', description: 'Upload bulk member spreadsheets with automatic duplicate detection' },
  { id: 'manage_classes', label: 'Manage Classes & Sections', category: 'Members & Student Registry', description: 'Configure school grades, classes, and section divisions' },
  { id: 'manage_departments', label: 'Manage Departments & Wings', category: 'Members & Student Registry', description: 'Configure organization departments, wings, and divisions' },
  { id: 'manage_industries', label: 'Manage Industry Sectors', category: 'Members & Student Registry', description: 'Configure industry verticals (Schools, Healthcare, Hospitality, Corporate)' },

  // ── 4. Product Catalog & Designs ──
  { id: 'view_products', label: 'View Products & Design Catalogs', category: 'Product Catalog & Designs', description: 'Browse products, art number hub, designs, fabrics, and trim catalogs' },
  { id: 'manage_products', label: 'Manage Products, Types & Garments', category: 'Product Catalog & Designs', description: 'Create and update products, product types, garments, and specifications' },
  { id: 'manage_group_designs', label: 'Manage Group Design Combinations', category: 'Product Catalog & Designs', description: 'Configure set items, product combinations, and group design codes' },
  { id: 'manage_design_numbers', label: 'Manage Design Numbers (DNS/DMG)', category: 'Product Catalog & Designs', description: 'Catalog variant design codes for fabric and trim compositions' },
  { id: 'manage_art_numbers', label: 'Manage ART Number Hub', category: 'Product Catalog & Designs', description: 'Configure official factory ART numbers and garment specifications' },
  { id: 'view_size_charts', label: 'View Standard Size Charts', category: 'Product Catalog & Designs', description: 'View US/UK size specifications and standard measurements' },
  { id: 'manage_size_charts', label: 'Manage Size Charts & Grading', category: 'Product Catalog & Designs', description: 'Create and modify standard size charts and dimension matrices' },

  // ── 5. Measurements & Fitting ──
  { id: 'manage_measurements', label: 'Execute & Record Measurements', category: 'Measurements & Sizing', description: 'Record bespoke customer measurements, use fitting templates, and manage tokens' },
  { id: 'view_measurements', label: 'View Measurement History', category: 'Measurements & Sizing', description: 'Inspect historic customer measurements, sizing logs, and fitting trends' },
  { id: 'manage_templates', label: 'Manage Industry Fitting Templates', category: 'Measurements & Sizing', description: 'Configure industry-specific measurement templates and field requirements' },
  { id: 'manage_measurement_config', label: 'Manage Measurement Config & Measures', category: 'Measurements & Sizing', description: 'Configure body measurement parameters, formulas, and size ranges' },
  { id: 'approve_measurements', label: 'Approve & Verify Measurements', category: 'Measurements & Sizing', description: 'Review and sign-off on recipient measurements before factory cutting release' },
  { id: 'manage_tokens', label: 'Manage Fitting Queue Tokens', category: 'Measurements & Sizing', description: 'Issue and verify measurement fitting tokens for students and staff' },

  // ── 6. Marketing & Quotations ──
  { id: 'manage_quotations', label: 'Create & Manage Quotations', category: 'Marketing & Quotations', description: 'Draft quotations, calculate fabric costing, SAM, margins, and delivery promises' },
  { id: 'view_quotations', label: 'View Quotations & Proposals', category: 'Marketing & Quotations', description: 'View client quotations, discount structures, and proposals' },
  { id: 'submit_quotations_bm', label: 'Submit Quotations to Branch Manager', category: 'Marketing & Quotations', description: 'Submit drafted quotations to the Branch Manager for initial commercial review' },
  { id: 'submit_quotations_ops', label: 'Submit Quotations to Ops Team (Branch Manager)', category: 'Marketing & Quotations', description: 'Review, approve, and submit commercial quotations to the factory operations team' },
  { id: 'corporate_approver', label: 'Branch Manager & Corporate Approver Review', category: 'Marketing & Quotations', description: 'Review, approve, request revisions, or hold quotations and sales orders' },
  { id: 'dispatch_proposals', label: 'Dispatch & Email Client Proposals', category: 'Marketing & Quotations', description: 'Send approved PDF contract proposals directly to customer contacts' },

  // ── 7. Sales Orders & Counter POS ──
  { id: 'branch_sales', label: 'Branch Sales & Counter Orders', category: 'Sales Orders & Counter POS', description: 'Create and process customer counter orders, retail sales, and dispatches' },
  { id: 'view_orders', label: 'View Sales Orders Registry', category: 'Sales Orders & Counter POS', description: 'Browse placed sales orders, production status, and delivery schedules' },
  { id: 'manage_orders', label: 'Manage Sales Orders & Order Placement', category: 'Sales Orders & Counter POS', description: 'Place new sales orders, update order status, and track production progress' },
  { id: 'manage_delivery_challans', label: 'Manage Delivery Challans (DC)', category: 'Sales Orders & Counter POS', description: 'Generate and dispatch goods delivery challans with consignment details' },

  // ── 8. Warehouse & Inventory ──
  { id: 'view_inventory', label: 'View Central Warehouse Stock & POs', category: 'Warehouse & Inventory', description: 'View central fabric, button, thread, and finished product stock' },
  { id: 'manage_inventory', label: 'Manage Stock Levels & Inwards', category: 'Warehouse & Inventory', description: 'Inward materials, issue purchase orders, and adjust central warehouse stock' },
  { id: 'branch_inventory', label: 'Branch Stock & Local Inventory', category: 'Warehouse & Inventory', description: 'Manage local outlet stock, variants, stock inwards, and branch counts' },
  { id: 'branch_transfers', label: 'Inter-Branch Stock Transfers', category: 'Warehouse & Inventory', description: 'Issue, request, dispatch, and accept stock transfers between branches' },
  { id: 'move_inventory', label: 'Relocate & Move Warehouse Inventory', category: 'Warehouse & Inventory', description: 'Move materials between warehouse racks, bins, and staging zones' },

  // ── 9. Purchasing & Suppliers ──
  { id: 'view_vendors', label: 'View Supplier & Vendor Registry', category: 'Purchasing & Suppliers', description: 'Browse supplier profiles, material lines, and vendor contact info' },
  { id: 'manage_vendors', label: 'Manage Vendors & Suppliers', category: 'Purchasing & Suppliers', description: 'Register, edit, and evaluate external fabric and trim suppliers' },
  { id: 'manage_purchase_orders', label: 'Create & Manage Purchase Orders (PO)', category: 'Purchasing & Suppliers', description: 'Generate purchase orders for fabrics, buttons, threads, and raw materials' },
  { id: 'manage_purchase_bills', label: 'Manage Purchase Bills & Goods Receipts', category: 'Purchasing & Suppliers', description: 'Process vendor bills, verify goods received against POs, and record payables' },

  // ── 10. Factory Operations ──
  { id: 'factory_po_handler', label: 'Factory PO Handler & Job Cards', category: 'Factory Operations', description: 'Issue job cards, review approved purchase orders, and allocate fabrics' },
  { id: 'factory_floor', label: 'Production Queue & Floor Stage Execution', category: 'Factory Operations', description: 'Execute cutting, stitching, finishing, packing, and dispatch on the floor' },

  // ── 11. Accounts & Finance ──
  { id: 'manage_invoices', label: 'Manage Invoices & Billing', category: 'Accounts & Finance', description: 'Generate GST customer invoices, debit/credit notes, and record payments' },
  { id: 'view_invoices', label: 'View Billing & Invoice History', category: 'Accounts & Finance', description: 'Access invoice history, payment records, and client account statements' },
  { id: 'manage_payments', label: 'Record Customer Payments & Advances', category: 'Accounts & Finance', description: 'Record advance receipts, initial quotation payments, and UPI collections' },
  { id: 'manage_expenses', label: 'Manage Vendor Payments & Operational Expenses', category: 'Accounts & Finance', description: 'Record vendor payouts, branch utility bills, and petty cash expenses' },
  { id: 'manage_company_bank', label: 'Manage Company Bank & Financial Details', category: 'Accounts & Finance', description: 'Configure bank account numbers, IFSC codes, UPI IDs, and invoice headers' },

  // ── 12. Engineering & SAM ──
  { id: 'manage_sam', label: 'Manage SAM Calculator & Operations', category: 'Engineering & SAM', description: 'Configure Standard Allowed Minute operations, fabric SAMs, and machine studies' },
  { id: 'view_sam_reports', label: 'View SAM & Operations Efficiency Reports', category: 'Engineering & SAM', description: 'Inspect factory worker SAM productivity, labor costing, and time studies' },

  // ── 13. Client Portal Access ──
  { id: 'view_own_students', label: 'Client Portal: View Own Members/Students', category: 'Client Portal', description: 'Allows client organization users to view their own enrolled students' },
  { id: 'view_own_measurements', label: 'Client Portal: View Own Measurements', category: 'Client Portal', description: 'Allows client organization/entity users to view fitting and size data' },
];

export interface RolePreset {
  name: string;
  badge: string;
  description: string;
  permissions: string[];
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    name: 'Branch Manager',
    badge: 'Retail Hub',
    description: 'Full store management, inventory, sales, quotes, invoices, measurements & registry',
    permissions: [
      'branch_inventory', 'branch_sales', 'branch_transfers',
      'view_employees', 'view_organizations', 'manage_schools', 'view_schools',
      'manage_classes', 'manage_departments', 'view_students', 'register_students',
      'manage_students', 'view_products', 'manage_products', 'view_measurements',
      'manage_measurements', 'manage_quotations', 'view_quotations', 'manage_invoices', 'view_invoices',
      'manage_payments', 'view_orders', 'manage_orders', 'corporate_approver', 'submit_quotations_ops'
    ]
  },
  {
    name: 'Branch Staff',
    badge: 'Store Counter',
    description: 'Store counter sales, measurements, stock view, student registry & quotes view',
    permissions: [
      'branch_inventory', 'branch_sales', 'view_organizations',
      'view_schools', 'view_students', 'register_students',
      'view_products', 'view_measurements', 'manage_measurements',
      'view_quotations', 'view_invoices', 'manage_orders'
    ]
  },
  {
    name: 'Factory PO Handler',
    badge: 'Manufacturing',
    description: 'Factory job cards, PO allocations, production queue & warehouse inventory',
    permissions: [
      'factory_po_handler', 'factory_floor', 'view_inventory', 'manage_inventory',
      'view_products', 'view_measurements'
    ]
  },
  {
    name: 'Factory Production Staff',
    badge: 'Floor Execution',
    description: 'Production queue execution, cutting, stitching, finishing & packing',
    permissions: [
      'factory_floor', 'view_products'
    ]
  },
  {
    name: 'Marketing Executive',
    badge: 'Sales & Quotes',
    description: 'Quotations, pricing, proposals, sales leads, and client accounts',
    permissions: [
      'manage_quotations', 'view_quotations', 'submit_quotations_bm', 'branch_sales',
      'view_organizations', 'view_schools', 'view_leads', 'manage_leads', 'view_products',
      'dispatch_proposals'
    ]
  },
  {
    name: 'Inventory Manager',
    badge: 'Warehouse',
    description: 'Central fabrics, trims, stock inwards, inter-branch transfers & purchase orders',
    permissions: [
      'view_inventory', 'manage_inventory', 'branch_transfers', 'view_products',
      'manage_products', 'view_size_charts', 'manage_size_charts', 'view_vendors',
      'manage_vendors', 'manage_purchase_orders', 'move_inventory'
    ]
  },
  {
    name: 'Accounts & Finance',
    badge: 'Finance',
    description: 'Customer invoices, receipts, payment collections, vendor payments & ledger',
    permissions: [
      'manage_invoices', 'view_invoices', 'manage_payments', 'manage_expenses',
      'manage_company_bank', 'view_organizations', 'view_quotations', 'branch_sales'
    ]
  },
  {
    name: 'Corporate Approver',
    badge: 'HQ Sign-off',
    description: 'Review branch sales orders, accept/reject/hold triage, view client quotes & products',
    permissions: [
      'corporate_approver', 'view_quotations', 'view_organizations', 'view_schools',
      'view_products', 'view_orders', 'view_audit_logs'
    ]
  },
  {
    name: 'Client Organization',
    badge: 'Portal',
    description: 'Client portal access to school registry, own students, classes & measurements',
    permissions: [
      'view_schools', 'view_own_students', 'manage_classes', 'view_own_measurements'
    ]
  }
];

export function getDefaultPermissionsForDepartment(department: string, designation: string = ''): string[] {
  const dept = (department || '').toLowerCase();
  const desig = (designation || '').toLowerCase();

  // 1. Factory / Production
  if (dept.includes('production') || dept.includes('cutting') || dept.includes('tailoring') || desig.includes('tailor') || desig.includes('master')) {
    return ['factory_floor', 'view_products', 'view_measurements'];
  }
  // 2. Factory Quality / Finishing / Supervisor
  if (dept.includes('quality') || dept.includes('finishing') || desig.includes('supervisor') || desig.includes('qc')) {
    return ['factory_po_handler', 'factory_floor', 'view_inventory', 'view_products', 'view_measurements'];
  }
  // 3. Measurements & Fitting
  if (dept.includes('measurement') || dept.includes('fitting') || desig.includes('measur')) {
    return ['manage_measurements', 'view_measurements', 'manage_tokens', 'view_schools', 'view_students', 'view_products'];
  }
  // 4. Sales & Marketing
  if (dept.includes('sales') || dept.includes('marketing') || desig.includes('sales') || desig.includes('marketing')) {
    return ['manage_quotations', 'view_quotations', 'submit_quotations_bm', 'branch_sales', 'view_organizations', 'view_schools', 'view_leads', 'manage_leads', 'view_products', 'view_measurements'];
  }
  // 5. Inventory & Logistics
  if (dept.includes('inventory') || dept.includes('logistics') || dept.includes('warehouse') || desig.includes('inventory') || desig.includes('stock')) {
    return ['view_inventory', 'manage_inventory', 'branch_inventory', 'branch_transfers', 'move_inventory', 'view_products', 'manage_purchase_orders'];
  }
  // 6. Accounts & Finance
  if (dept.includes('account') || dept.includes('finance') || desig.includes('account') || desig.includes('cashier')) {
    return ['manage_invoices', 'view_invoices', 'manage_payments', 'manage_expenses', 'manage_company_bank', 'branch_sales', 'view_quotations'];
  }
  // 7. Human Resources / Admin
  if (dept.includes('human') || dept.includes('hr') || desig.includes('hr') || desig.includes('admin')) {
    return ['view_employees', 'manage_employees', 'manage_roles', 'view_audit_logs'];
  }
  // 8. Management & Branch Head
  if (dept.includes('management') || desig.includes('manager')) {
    return [
      'branch_inventory', 'branch_sales', 'branch_transfers', 'view_employees',
      'view_organizations', 'manage_schools', 'view_schools', 'view_students',
      'register_students', 'view_products', 'view_measurements', 'manage_measurements',
      'manage_quotations', 'view_quotations', 'corporate_approver', 'submit_quotations_ops', 'manage_invoices', 'view_invoices'
    ];
  }
  // Default fallback baseline
  return ['branch_inventory', 'branch_sales', 'view_products', 'view_measurements'];
}

