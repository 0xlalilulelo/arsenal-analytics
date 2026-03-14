'use client';
import { use, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const CATEGORY_LABEL: Record<string, string> = {
  LABOR: 'Labor', PARTS: 'Parts', SHOP_SUPPLIES: 'Shop Supplies',
  FREIGHT: 'Freight', SUBCONTRACT: 'Subcontract', OTHER: 'Other',
};
const BILLING_LABEL: Record<string, string> = {
  TIME_AND_MATERIALS: 'Time & Materials', FLAT_RATE: 'Flat Rate', NOT_TO_EXCEED: 'Not to Exceed', PROGRESSIVE: 'Progressive',
};

type Quote = {
  id: string; quoteNumber: string; status: string;
  billingModel: string; nteAmount: number | null;
  subtotal: number; total: number; depositPct: number; depositAmount: number;
  validDays: number; expiresAt: string | null; sentAt: string | null;
  notes: string | null;
  customer: { name: string; email: string | null; phone: string | null; address: string | null; accountNumber: string | null };
  aircraft: { nNumber: string; make: string; model: string; year: number | null; serial: string; ttsn: number | null } | null;
  lines: { id: string; category: string; description: string; qty: number; unitPrice: number; total: number }[];
  org: { name: string };
};

function useQuotePrint(id: string) {
  return useQuery({
    queryKey: ['quote-print', id],
    queryFn: async () => {
      const res = await fetch(`/api/quotes/${id}`);
      if (!res.ok) throw new Error('Not found');
      return res.json() as Promise<{ data: Quote }>;
    },
  });
}

export default function PrintQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuotePrint(id);

  useEffect(() => {
    if (data?.data) {
      document.title = `Quote ${data.data.quoteNumber}`;
      setTimeout(() => window.print(), 400);
    }
  }, [data?.data?.quoteNumber]);

  if (isLoading || !data?.data) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Loader2 style={{ width: 32, height: 32 }} className="animate-spin" /></div>;
  }

  const q = data.data;
  const laborTotal = q.lines.filter(l => l.category === 'LABOR').reduce((s, l) => s + l.total, 0);
  const partsTotal = q.lines.filter(l => l.category === 'PARTS').reduce((s, l) => s + l.total, 0);
  const expiresAt = q.expiresAt ? new Date(q.expiresAt) : null;

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
        .muted { color: #888; }
        .right { text-align: right; }
        .bold { font-weight: 700; }
        .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: #888; margin: 24px 0 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
        .notice { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px 16px; font-size: 12px; color: #92400e; margin-top: 20px; }
        .sig-block { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .sig-line { border-top: 1px solid #888; padding-top: 4px; font-size: 11px; color: #888; }
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
            <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-.02em' }}>✈ {q.org?.name ?? 'Arsenal Aviation'}</div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Aviation Maintenance & Repair</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.05em' }}>Service Estimate</div>
            <div className="mono bold" style={{ fontSize: '22px' }}>{q.quoteNumber}</div>
            <div style={{ marginTop: '4px', fontSize: '11px', color: '#888' }}>{q.status} · {BILLING_LABEL[q.billingModel] ?? q.billingModel}</div>
          </div>
        </div>

        {/* Customer + Aircraft */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div>
            <div className="label">Prepared For</div>
            <div className="val bold">{q.customer.name}</div>
            {q.customer.accountNumber && <div className="mono" style={{ fontSize: '11px', color: '#888' }}>Acct #{q.customer.accountNumber}</div>}
            {q.customer.email && <div style={{ fontSize: '11px', color: '#555' }}>{q.customer.email}</div>}
            {q.customer.phone && <div style={{ fontSize: '11px', color: '#555' }}>{q.customer.phone}</div>}
          </div>
          <div>
            {q.aircraft && (
              <>
                <div className="label">Aircraft</div>
                <div className="val mono bold">{q.aircraft.nNumber}</div>
                <div style={{ fontSize: '12px', color: '#555' }}>{q.aircraft.make} {q.aircraft.model}</div>
                {q.aircraft.year && <div style={{ fontSize: '11px', color: '#888' }}>{q.aircraft.year}</div>}
                {q.aircraft.ttsn != null && <div style={{ fontSize: '11px', color: '#888' }}>{q.aircraft.ttsn.toLocaleString()}h TTSN</div>}
              </>
            )}
          </div>
          <div>
            {q.sentAt && <><div className="label">Date Issued</div><div className="val">{formatDate(q.sentAt)}</div></>}
            {expiresAt && <><div className="label" style={{ marginTop: '10px' }}>Valid Until</div><div className="val">{formatDate(expiresAt.toISOString())}</div></>}
            {q.nteAmount && <><div className="label" style={{ marginTop: '10px' }}>Not to Exceed</div><div className="val mono gold">{formatCurrency(q.nteAmount)}</div></>}
          </div>
        </div>

        {/* Line Items */}
        <div className="section-title">Scope of Work</div>
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
            {q.lines.map(l => (
              <tr key={l.id}>
                <td>{CATEGORY_LABEL[l.category] ?? l.category}</td>
                <td>{l.description}</td>
                <td className="right mono">{l.qty}</td>
                <td className="right mono">{formatCurrency(l.unitPrice)}</td>
                <td className="right mono bold">{formatCurrency(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <table style={{ width: '260px' }}>
            <tbody>
              {laborTotal > 0 && <tr><td className="muted right" style={{ paddingRight: '16px' }}>Labor</td><td className="right mono">{formatCurrency(laborTotal)}</td></tr>}
              {partsTotal > 0 && <tr><td className="muted right" style={{ paddingRight: '16px' }}>Parts</td><td className="right mono">{formatCurrency(partsTotal)}</td></tr>}
              <tr style={{ borderTop: '2px solid #111' }}>
                <td className="right bold" style={{ paddingRight: '16px' }}>Estimate Total</td>
                <td className="right mono gold bold" style={{ fontSize: '15px' }}>{formatCurrency(q.total)}</td>
              </tr>
              {q.depositPct > 0 && (
                <tr>
                  <td className="muted right" style={{ paddingRight: '16px' }}>Deposit ({(q.depositPct * 100).toFixed(0)}%)</td>
                  <td className="right mono bold">{formatCurrency(q.depositAmount)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {q.notes && (
          <>
            <div className="section-title">Notes</div>
            <p style={{ fontSize: '12px', color: '#555', whiteSpace: 'pre-wrap' }}>{q.notes}</p>
          </>
        )}

        {/* Validity notice */}
        {expiresAt && (
          <div className="notice">
            This estimate is valid until {formatDate(expiresAt.toISOString())} ({q.validDays} days). Prices are subject to change after expiration.
            Actual costs may vary based on final inspection results.
          </div>
        )}

        {/* Signature blocks */}
        <div className="sig-block">
          <div>
            <div style={{ height: '40px' }} />
            <div className="sig-line">Authorized — {q.org?.name ?? 'Arsenal Aviation'}</div>
          </div>
          <div>
            <div style={{ height: '40px' }} />
            <div className="sig-line">Customer Approval — {q.customer.name} &nbsp;&nbsp; Date: ___________</div>
          </div>
        </div>

        <div style={{ marginTop: '32px', fontSize: '10px', color: '#aaa', textAlign: 'center' }}>
          {q.org?.name ?? 'Arsenal Aviation Services'} · Service Estimate {q.quoteNumber}
        </div>
      </div>
    </>
  );
}
