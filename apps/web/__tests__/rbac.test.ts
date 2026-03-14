import { describe, it, expect } from 'vitest';
import { hasRole, can } from '@/lib/rbac';

describe('hasRole', () => {
  it('returns false for undefined role', () => {
    expect(hasRole(undefined, 'TECHNICIAN')).toBe(false);
  });

  it('returns false for unknown role string', () => {
    expect(hasRole('SUPERADMIN', 'TECHNICIAN')).toBe(false);
  });

  it('TECHNICIAN satisfies TECHNICIAN requirement', () => {
    expect(hasRole('TECHNICIAN', 'TECHNICIAN')).toBe(true);
  });

  it('TECHNICIAN does NOT satisfy PARTS_CLERK requirement', () => {
    expect(hasRole('TECHNICIAN', 'PARTS_CLERK')).toBe(false);
  });

  it('OWNER satisfies all role requirements', () => {
    expect(hasRole('OWNER', 'TECHNICIAN')).toBe(true);
    expect(hasRole('OWNER', 'PARTS_CLERK')).toBe(true);
    expect(hasRole('OWNER', 'ACCOUNTANT')).toBe(true);
    expect(hasRole('OWNER', 'MANAGER')).toBe(true);
    expect(hasRole('OWNER', 'OWNER')).toBe(true);
  });

  it('role hierarchy is TECHNICIAN < PARTS_CLERK < ACCOUNTANT < MANAGER < OWNER', () => {
    const roles = ['TECHNICIAN', 'PARTS_CLERK', 'ACCOUNTANT', 'MANAGER', 'OWNER'] as const;
    for (let i = 0; i < roles.length; i++) {
      for (let j = 0; j <= i; j++) {
        expect(hasRole(roles[i], roles[j])).toBe(true);
      }
      for (let j = i + 1; j < roles.length; j++) {
        expect(hasRole(roles[i], roles[j])).toBe(false);
      }
    }
  });
});

describe('can helpers', () => {
  describe('viewFinancials', () => {
    it('allowed for ACCOUNTANT and above', () => {
      expect(can.viewFinancials('ACCOUNTANT')).toBe(true);
      expect(can.viewFinancials('MANAGER')).toBe(true);
      expect(can.viewFinancials('OWNER')).toBe(true);
    });
    it('denied for PARTS_CLERK and TECHNICIAN', () => {
      expect(can.viewFinancials('PARTS_CLERK')).toBe(false);
      expect(can.viewFinancials('TECHNICIAN')).toBe(false);
      expect(can.viewFinancials(undefined)).toBe(false);
    });
  });

  describe('sendInvoice', () => {
    it('allowed for MANAGER and above', () => {
      expect(can.sendInvoice('MANAGER')).toBe(true);
      expect(can.sendInvoice('OWNER')).toBe(true);
    });
    it('denied below MANAGER', () => {
      expect(can.sendInvoice('ACCOUNTANT')).toBe(false);
      expect(can.sendInvoice('TECHNICIAN')).toBe(false);
    });
  });

  describe('recordPayment', () => {
    it('allowed for ACCOUNTANT and above', () => {
      expect(can.recordPayment('ACCOUNTANT')).toBe(true);
      expect(can.recordPayment('MANAGER')).toBe(true);
      expect(can.recordPayment('OWNER')).toBe(true);
    });
    it('denied below ACCOUNTANT', () => {
      expect(can.recordPayment('PARTS_CLERK')).toBe(false);
      expect(can.recordPayment('TECHNICIAN')).toBe(false);
    });
  });

  describe('manageUsers', () => {
    it('only allowed for OWNER', () => {
      expect(can.manageUsers('OWNER')).toBe(true);
    });
    it('denied for all other roles', () => {
      expect(can.manageUsers('MANAGER')).toBe(false);
      expect(can.manageUsers('ACCOUNTANT')).toBe(false);
      expect(can.manageUsers('PARTS_CLERK')).toBe(false);
      expect(can.manageUsers('TECHNICIAN')).toBe(false);
      expect(can.manageUsers(undefined)).toBe(false);
    });
  });

  describe('logLabor', () => {
    it('allowed for all authenticated roles', () => {
      expect(can.logLabor('TECHNICIAN')).toBe(true);
      expect(can.logLabor('PARTS_CLERK')).toBe(true);
      expect(can.logLabor('MANAGER')).toBe(true);
      expect(can.logLabor('OWNER')).toBe(true);
    });
    it('denied for unauthenticated', () => {
      expect(can.logLabor(undefined)).toBe(false);
    });
  });

  describe('createPO / receiveParts', () => {
    it('PARTS_CLERK can create PO', () => {
      expect(can.createPO('PARTS_CLERK')).toBe(true);
      expect(can.receiveParts('PARTS_CLERK')).toBe(true);
    });
    it('TECHNICIAN cannot create PO', () => {
      expect(can.createPO('TECHNICIAN')).toBe(false);
    });
  });

  describe('approveSquawk / deleteWorkOrder', () => {
    it('requires MANAGER', () => {
      expect(can.approveSquawk('MANAGER')).toBe(true);
      expect(can.deleteWorkOrder('MANAGER')).toBe(true);
      expect(can.approveSquawk('ACCOUNTANT')).toBe(false);
      expect(can.deleteWorkOrder('TECHNICIAN')).toBe(false);
    });
  });
});
