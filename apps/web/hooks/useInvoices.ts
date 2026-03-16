import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type InvoiceDetail = {
  id: string;
  invoiceNumber: string;
  customer: { name: string; accountNumber: string | null; billingTerms: string | null };
  workOrder: { id: string; number: string } | null;
  status: string;
  issueDate: string;
  dueDate: string | null;
  total: number;
  taxAmount: number;
  amountPaid: number;
  balance: number;
  portalToken: string | null;
  notes: string | null;
  lineItems: Array<{ id: string; category: string; description: string; qty: number; unitPrice: number; total: number }>;
  payments: Array<{ id: string; amount: number; method: string; reference: string | null; memo: string | null; paidAt: string }>;
};

export type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  customer: { name: string; accountNumber: string | null };
  workOrder: { number: string } | null;
  status: string;
  issueDate: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  balance: number;
};

async function fetchInvoices(filters: { status?: string; customerId?: string; page?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.customerId) params.set('customerId', filters.customerId);
  if (filters.page) params.set('page', String(filters.page));
  const res = await fetch(`/api/invoices?${params}`);
  if (!res.ok) throw new Error('Failed to fetch invoices');
  return res.json();
}

export function useInvoices(filters: { status?: string; customerId?: string; page?: number } = {}) {
  return useQuery<{ data: InvoiceSummary[]; total: number; page: number; limit: number }>({
    queryKey: ['invoices', filters],
    queryFn: () => fetchInvoices(filters),
  });
}

export function useInvoiceDetail(id: string) {
  return useQuery<InvoiceDetail>({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error('Invoice not found');
      return res.json().then((r: { data: InvoiceDetail }) => r.data);
    },
    enabled: !!id,
  });
}

export function useUpdateInvoice(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { status?: string; notes?: string }) => {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update invoice');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useRecordPayment(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { amount: number; method: string; reference?: string; memo?: string }) => {
      const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to record payment');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
