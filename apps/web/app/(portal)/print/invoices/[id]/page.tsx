'use client';
import { use, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const CATEGORY_LABEL: Record<string, string> = {
  LABOR: 'Labor', PARTS: 'Parts', SHOP_SUPPLIES: 'Shop Supplies',
  FREIGHT: 'Freight', HANDLING: 'Handling', SUBCONTRACT: 'Subcontract', OTHER: 'Other',
};
const METHOD_LABEL: Record<string, string> = {
  CHECK: 'Check', ACH: 'ACH', CREDIT_CARD: 'Credit Card', CASH: 'Cash', WIRE: 'Wire', STRIPE: 'Online',
};

type Invoice = {
  id: string; invoiceNumber: string; status: string;
  issueDate: string; dueDate: string | null;
  subtotal: number; taxRate: number; taxAmount: number; total: number;
  amountPaid: number; balance: number; notes: string | null;
  customer: { name: string; email: string | null; phone: string | null; address: string | null; accountNumber: string | null };
  workOrder: { number: string; aircraft: { nNumber: string; make: string; model: string } | null } | null;
  lineItems: { id: string; category: string; description: string; qty: number; unitPrice: number; total: number; taxable: boolean }[];
  payments: { id: string; amount: number; method: string; paidAt: string; reference: string | null }[];
  org: { name: string };
};

function useInvoicePrint(id: string) {
  return useQuery({
    queryKey: ['invoice-print', id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error('Not found');
      return res.json() as Promise<{ data: Invoice }>;
    },
  });
}

export default function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useInvoicePrint(id);

  useEffect(() => {
    if (data?.data) {
      document.title = `Invoice ${data.data.invoiceNumber}`;
      setTimeout(() => window.print(), 400);
    }
  }, [data?.data?.invoiceNumber]);

  if (isLoading || !data?.data) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const inv = data.data;
  const isPaid = inv.balance === 0;

  return (
    <>
      <style>{`
        @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; background: white; margin: 0; }
        .page { max-width: 760px; margin: 0 auto; padding: 40px 48px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 7px 10px; font-size: 12px; }
        th { background: #f5f5f7; font-weight: 600; color: #555; }
        td { border-bottom: 1px solid #eee; }
        .mono { font-family: 'Courier New', monospace; }
        .label { color: #888; font-size: 11px; margin-bottom: 2px; }
        .val { font-size: 13px; font-weight: 500; }
        .gold { color: #b45309; }
        .success { color: #15803d; }
        .muted { color: #888; }
        .right { text-align: right; }
        .bold { font-weight: 700; }
        .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: #888; margin: 24px 0 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
      `}</style>

      <div className="no-print" style={{ background: '#f0f0f0', padding: '12px', textAlign: 'center', fontSize: '13px', color: '#555' }}>
        Print dialog should open automatically — or use <strong>Ctrl+P</strong> / <strong>⌘P</strong>.
        <button onClick={() => window.print()} style={{ marginLeft: '12px', padding: '4px 12px', cursor: 'pointer' }}>Print</button>
        <button onClick={() => window.close()} style={{ marginLeft: '8px', padding: '4px 12px', cursor: 'pointer' }}>Close</button>
      </div>

      <div className="page">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-.02em' }}>✈ {inv.org?.name ?? 'Arsenal Aviation'}</div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Aviation Maintenance & Repair</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.05em' }}>Invoice</div>
            <div className="mono bold" style={{ fontSize: '22px' }}>{inv.invoiceNumber}</div>
            <div style={{ marginTop: '4px', display: 'inline-block', padding: '2px 8px', background: isPaid ? '#dcfce7' : '#fef3c7', color: isPaid ? '#166534' : '#92400e', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
              {isPaid ? 'PAID' : inv.status}
            </div>
          </div>
        </div>

        {/* Bill to + details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div>
            <div className="label">Bill To</div>
            <div className="val bold">{inv.customer.name}</div>
            {inv.customer.accountNumber && <div className="mono" style={{ fontSize: '11px', color: '#888' }}>Acct #{inv.customer.accountNumber}</div>}
            {inv.customer.address && <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>{inv.customer.address}</div>}
            {inv.customer.email && <div style={{ fontSize: '11px', color: '#555' }}>{inv.customer.email}</div>}
            {inv.customer.phone && <div style={{ fontSize: '11px', color: '#555' }}>{inv.customer.phone}</div>}
          </div>
          <div>
            <div className="label">Issue Date</div>
            <div className="val">{formatDate(inv.issueDate)}</div>
            {inv.dueDate && (
              <>
                <div className="label" style={{ marginTop: '10px' }}>Due Date</div>
                <div className="val">{formatDate(inv.dueDate)}</div>
              </>
            )}
          </div>
          <div>
            {inv.workOrder && (
              <>
                <div className="label">Work Order</div>
                <div className="val mono">{inv.workOrder.number}</div>
              </>
            )}
            {inv.workOrder?.aircraft && (
              <>
                <div className="label" style={{ marginTop: '10px' }}>Aircraft</div>
                <div className="val mono">{inv.workOrder.aircraft.nNumber}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>{inv.workOrder.aircraft.make} {inv.workOrder.aircraft.model}</div>
              </>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="section-title">Services & Parts</div>
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Category</th>
              <th style={{ textAlign: 'left' }}>Description</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Unit Price</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {inv.lineItems.map(li => (
              <tr key={li.id}>
                <td>{CATEGORY_LABEL[li.category] ?? li.category}</td>
                <td>{li.description}</td>
                <td className="right mono">{li.qty}</td>
                <td className="right mono">{formatCurrency(li.unitPrice)}</td>
                <td className="right mono bold">{formatCurrency(li.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <table style={{ width: '260px' }}>
            <tbody>
              <tr><td className="muted right" style={{ paddingRight: '16px' }}>Subtotal</td><td className="right mono">{formatCurrency(inv.subtotal)}</td></tr>
              {inv.taxRate > 0 && <tr><td className="muted right" style={{ paddingRight: '16px' }}>Tax ({(inv.taxRate * 100).toFixed(1)}%)</td><td className="right mono">{formatCurrency(inv.taxAmount)}</td></tr>}
              <tr style={{ borderTop: '2px solid #111' }}>
                <td className="right bold" style={{ paddingRight: '16px' }}>Total</td>
                <td className="right mono gold bold" style={{ fontSize: '15px' }}>{formatCurrency(inv.total)}</td>
              </tr>
              {inv.amountPaid > 0 && <tr><td className="muted right" style={{ paddingRight: '16px' }}>Payments</td><td className="right mono success">−{formatCurrency(inv.amountPaid)}</td></tr>}
              {inv.balance > 0 && (
                <tr style={{ borderTop: '1px solid #eee' }}>
                  <td className="right bold" style={{ paddingRight: '16px' }}>Balance Due</td>
                  <td className="right mono bold" style={{ color: '#b45309', fontSize: '15px' }}>{formatCurrency(inv.balance)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Payments */}
        {inv.payments.length > 0 && (
          <>
            <div className="section-title">Payment History</div>
            <table>
              <thead><tr><th style={{ textAlign: 'left' }}>Method</th><th style={{ textAlign: 'left' }}>Reference</th><th style={{ textAlign: 'left' }}>Date</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
              <tbody>
                {inv.payments.map(p => (
                  <tr key={p.id}>
                    <td>{METHOD_LABEL[p.method] ?? p.method}</td>
                    <td className="mono">{p.reference ?? '—'}</td>
                    <td>{formatDate(p.paidAt)}</td>
                    <td className="right mono success bold">{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Notes */}
        {inv.notes && (
          <>
            <div className="section-title">Notes</div>
            <p style={{ fontSize: '12px', color: '#555', whiteSpace: 'pre-wrap' }}>{inv.notes}</p>
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '12px', fontSize: '10px', color: '#aaa', textAlign: 'center' }}>
          Thank you for your business. Please remit payment by the due date. — {inv.org?.name ?? 'Arsenal Aviation Services'}
        </div>
      </div>
    </>
  );
}
