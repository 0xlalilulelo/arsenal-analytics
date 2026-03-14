/**
 * Role-Based Access Control helpers
 * Roles in ascending privilege order: TECHNICIAN < PARTS_CLERK < ACCOUNTANT < MANAGER < OWNER
 */

export type UserRole = 'OWNER' | 'MANAGER' | 'ACCOUNTANT' | 'PARTS_CLERK' | 'TECHNICIAN';

const ROLE_RANK: Record<UserRole, number> = {
  TECHNICIAN: 1,
  PARTS_CLERK: 2,
  ACCOUNTANT: 3,
  MANAGER: 4,
  OWNER: 5,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  ACCOUNTANT: 'Accountant',
  PARTS_CLERK: 'Parts Clerk',
  TECHNICIAN: 'Technician',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  OWNER: 'Full access — billing, users, settings, financials',
  MANAGER: 'Manage WOs, invoices, quotes, technicians; no user management',
  ACCOUNTANT: 'View and manage invoices, payments, and financial reports',
  PARTS_CLERK: 'Manage parts inventory and purchase orders',
  TECHNICIAN: 'View assigned work orders; log time; manage own parts requests',
};

export function hasRole(userRole: string | undefined, required: UserRole): boolean {
  if (!userRole) return false;
  return (ROLE_RANK[userRole as UserRole] ?? 0) >= ROLE_RANK[required];
}

/** Permissions */
export const can = {
  // Financial
  viewFinancials: (role?: string) => hasRole(role, 'ACCOUNTANT'),
  voidInvoice: (role?: string) => hasRole(role, 'ACCOUNTANT'),
  sendInvoice: (role?: string) => hasRole(role, 'MANAGER'),
  recordPayment: (role?: string) => hasRole(role, 'ACCOUNTANT'),

  // Work orders
  createWorkOrder: (role?: string) => hasRole(role, 'MANAGER'),
  deleteWorkOrder: (role?: string) => hasRole(role, 'MANAGER'),
  approveSquawk: (role?: string) => hasRole(role, 'MANAGER'),
  logLabor: (role?: string) => hasRole(role, 'TECHNICIAN'),

  // Quotes
  sendQuote: (role?: string) => hasRole(role, 'MANAGER'),
  createQuote: (role?: string) => hasRole(role, 'MANAGER'),

  // Parts
  createPO: (role?: string) => hasRole(role, 'PARTS_CLERK'),
  receiveParts: (role?: string) => hasRole(role, 'PARTS_CLERK'),

  // Users / settings
  manageUsers: (role?: string) => hasRole(role, 'OWNER'),
  manageSettings: (role?: string) => hasRole(role, 'MANAGER'),
} as const;
