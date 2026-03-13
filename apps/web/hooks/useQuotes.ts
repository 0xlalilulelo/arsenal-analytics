import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type QuoteStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'APPROVED' | 'DECLINED' | 'EXPIRED' | 'CONVERTED';

export type QuoteLine = {
  id: string;
  category: 'LABOR' | 'PARTS' | 'SUBCONTRACT' | 'SHOP_SUPPLIES' | 'FREIGHT' | 'OTHER';
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
  sortOrder: number;
};

export type QuoteSummary = {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  billingModel: string;
  nteAmount: number | null;
  subtotal: number;
  total: number;
  depositPct: number;
  depositAmount: number;
  validDays: number;
  expiresAt: string | null;
  sentAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  declinedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; name: string; accountNumber: string | null };
  aircraft: { id: string; nNumber: string; make: string; model: string } | null;
  laborRate: { id: string; name: string; rate: number } | null;
  _count: { lines: number; workOrders: number };
};

export type QuoteDetail = Omit<QuoteSummary, '_count'> & {
  notes: string | null;
  internalNotes: string | null;
  declineReason: string | null;
  customer: {
    id: string; name: string; email: string | null; phone: string | null;
    accountNumber: string | null; billingTerms: string;
  };
  aircraft: {
    id: string; nNumber: string; make: string; model: string;
    serial: string; ttsn: number | null; year: number | null;
  } | null;
  laborRate: { id: string; name: string; rate: number; multiplier: number } | null;
  lines: QuoteLine[];
  workOrders: Array<{ id: string; number: string; status: string; createdAt: string }>;
};

// ─── List ─────────────────────────────────────────────────────────────────────

export function useQuotes(params: { status?: QuoteStatus; search?: string; page?: number } = {}) {
  return useQuery<{ data: QuoteSummary[]; total: number; page: number; limit: number }>({
    queryKey: ['quotes', params],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (params.status) p.set('status', params.status);
      if (params.search) p.set('search', params.search);
      if (params.page) p.set('page', String(params.page));
      const res = await fetch(`/api/quotes?${p}`);
      if (!res.ok) throw new Error('Failed to fetch quotes');
      return res.json();
    },
  });
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export function useQuoteDetail(id: string) {
  return useQuery<{ data: QuoteDetail }>({
    queryKey: ['quote', id],
    queryFn: async () => {
      const res = await fetch(`/api/quotes/${id}`);
      if (!res.ok) throw new Error('Failed to fetch quote');
      return res.json();
    },
    enabled: !!id,
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      customerId: string;
      aircraftId?: string;
      billingModel?: string;
      nteAmount?: number;
      laborRateId?: string;
      depositPct?: number;
      validDays?: number;
      notes?: string;
      internalNotes?: string;
      lines: Array<{ category: string; description: string; qty: number; unitPrice: number }>;
    }) => {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create quote');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export function useUpdateQuote(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<{
      status: QuoteStatus;
      billingModel: string;
      nteAmount: number | null;
      depositPct: number;
      validDays: number;
      notes: string;
      internalNotes: string;
      approvedBy: string;
      declineReason: string;
      lines: Array<{ category: string; description: string; qty: number; unitPrice: number; sortOrder?: number }>;
    }>) => {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update quote');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quote', id] });
      qc.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

// ─── Send ─────────────────────────────────────────────────────────────────────

export function useSendQuote(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/quotes/${id}/send`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to send quote');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quote', id] });
      qc.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

// ─── Convert to WO ────────────────────────────────────────────────────────────

export function useConvertQuote(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { depositCollected?: number } = {}) => {
      const res = await fetch(`/api/quotes/${id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to convert quote');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quote', id] });
      qc.invalidateQueries({ queryKey: ['quotes'] });
      qc.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });
}
