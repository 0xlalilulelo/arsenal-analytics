'use client';
import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useQuoteDetail, useUpdateQuote, useSendQuote, useConvertQuote } from '@/hooks/useQuotes';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ChevronLeft, Send, CheckCircle2, XCircle, ArrowRight, Loader2,
  Plane, Clock, FileText, DollarSign, AlertTriangle, Copy, ExternalLink, Printer, Pencil,
} from 'lucide-react';

const BILLING_MODELS = ['TIME_AND_MATERIALS', 'FLAT_RATE', 'HYBRID', 'NOT_TO_EXCEED', 'COST_PLUS'];

const CATEGORY_COLOR: Record<string, string> = {
  LABOR:         'text-intent-primary',
  PARTS:         'text-intent-warning',
  SUBCONTRACT:   'text-content-secondary',
  SHOP_SUPPLIES: 'text-content-muted',
  FREIGHT:       'text-content-muted',
  OTHER:         'text-content-muted',
};

const STATUS_BADGE: Record<string, 'draft' | 'sent' | 'inspection' | 'aog' | 'closed' | 'default'> = {
  DRAFT:     'draft',
  SENT:      'sent',
  VIEWED:    'sent',
  APPROVED:  'inspection',
  DECLINED:  'aog',
  EXPIRED:   'aog',
  CONVERTED: 'closed',
};

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading, isError } = useQuoteDetail(id);
  const { mutateAsync: updateQuote, isPending: updatePending } = useUpdateQuote(id);
  const { mutateAsync: sendQuote, isPending: sendPending } = useSendQuote(id);
  const { mutateAsync: convertQuote, isPending: convertPending } = useConvertQuote(id);

  const [editOpen, setEditOpen] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editBillingModel, setEditBillingModel] = useState('');
  const [editNte, setEditNte] = useState('');
  const [editValidDays, setEditValidDays] = useState('');
  const [editDepositPct, setEditDepositPct] = useState('');
  const [editPending, setEditPending] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [approvedBy, setApprovedBy] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [depositCollected, setDepositCollected] = useState('');
  const [sendResult, setSendResult] = useState<{ approvalUrl: string; message: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Quote" subtitle="Loading…" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
        </div>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Quote" subtitle="Not found" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-content-muted">Quote not found.</p>
        </div>
      </div>
    );
  }

  const quote = data.data;
  const isEditable = ['DRAFT', 'SENT', 'VIEWED'].includes(quote.status);
  const canSend = ['DRAFT'].includes(quote.status);
  const canApprove = ['SENT', 'VIEWED', 'DRAFT'].includes(quote.status);
  const canDecline = ['SENT', 'VIEWED', 'DRAFT'].includes(quote.status);
  const canConvert = quote.status === 'APPROVED' && quote.workOrders.length === 0;

  const laborTotal = quote.lines.filter(l => l.category === 'LABOR').reduce((s, l) => s + l.total, 0);
  const partsTotal = quote.lines.filter(l => l.category === 'PARTS').reduce((s, l) => s + l.total, 0);
  const otherTotal = quote.lines.filter(l => !['LABOR', 'PARTS'].includes(l.category)).reduce((s, l) => s + l.total, 0);

  async function handleApprove() {
    setActionError(null);
    try {
      await updateQuote({ status: 'APPROVED', approvedBy: approvedBy || 'Customer' });
      setApproveOpen(false);
    } catch (e: any) { setActionError(e.message); }
  }

  async function handleDecline() {
    setActionError(null);
    try {
      await updateQuote({ status: 'DECLINED', declineReason });
      setDeclineOpen(false);
    } catch (e: any) { setActionError(e.message); }
  }

  async function handleSend() {
    setActionError(null);
    try {
      const result = await sendQuote();
      setSendResult({ approvalUrl: result.approvalUrl, message: result.message });
    } catch (e: any) { setActionError(e.message); }
  }

  async function handleConvert() {
    setActionError(null);
    try {
      const result = await convertQuote({
        depositCollected: depositCollected ? parseFloat(depositCollected) : undefined,
      });
      router.push(`/work-orders/${result.data.id}`);
    } catch (e: any) { setActionError(e.message); }
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={quote.quoteNumber}
        subtitle={`${quote.customer.name}${quote.aircraft ? ` · ${quote.aircraft.nNumber}` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/quotes">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <ChevronLeft className="h-3.5 w-3.5" />Quotes
              </Button>
            </Link>

            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={() => window.open(`/print/quotes/${id}`, '_blank')}>
              <Printer className="h-3.5 w-3.5" />Print
            </Button>
            {['DRAFT', 'SENT', 'VIEWED'].includes(quote.status) && (
              <Button
                size="sm" variant="ghost" className="h-8 text-xs gap-1"
                onClick={() => {
                  setEditNotes(quote.notes ?? '');
                  setEditBillingModel(quote.billingModel);
                  setEditNte(quote.nteAmount?.toString() ?? '');
                  setEditValidDays(quote.validDays?.toString() ?? '30');
                  setEditDepositPct((Math.round(quote.depositPct * 100)).toString());
                  setEditOpen(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />Edit
              </Button>
            )}
            {canSend && (
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setSendOpen(true)} disabled={sendPending}>
                <Send className="h-3.5 w-3.5" />Send to Customer
              </Button>
            )}

            {canApprove && (
              <Button size="sm" className="h-8 text-xs gap-1 bg-intent-success hover:bg-intent-success/90" onClick={() => setApproveOpen(true)}>
                <CheckCircle2 className="h-3.5 w-3.5" />Mark Approved
              </Button>
            )}

            {canConvert && (
              <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setConvertOpen(true)} disabled={convertPending}>
                <ArrowRight className="h-3.5 w-3.5" />Convert to WO
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">

        {/* Status banner */}
        {quote.status === 'APPROVED' && quote.workOrders.length === 0 && (
          <Alert className="border-intent-success/40 bg-intent-success/10">
            <CheckCircle2 className="h-4 w-4 text-intent-success" />
            <AlertDescription className="text-intent-success">
              Approved{quote.approvedBy ? ` by ${quote.approvedBy}` : ''}{quote.approvedAt ? ` on ${formatDate(quote.approvedAt)}` : ''}.
              {' '}Ready to convert to a work order.
            </AlertDescription>
          </Alert>
        )}

        {quote.status === 'CONVERTED' && quote.workOrders[0] && (
          <Alert className="border-intent-primary/40 bg-intent-primary/10">
            <ArrowRight className="h-4 w-4 text-intent-primary" />
            <AlertDescription>
              Converted to{' '}
              <Link href={`/work-orders/${quote.workOrders[0].id}`} className="font-mono font-semibold text-intent-primary hover:underline">
                {quote.workOrders[0].number}
              </Link>.
            </AlertDescription>
          </Alert>
        )}

        {quote.status === 'DECLINED' && (
          <Alert className="border-intent-danger/40 bg-intent-danger/10">
            <XCircle className="h-4 w-4 text-intent-danger" />
            <AlertDescription className="text-intent-danger">
              Declined{quote.declinedAt ? ` on ${formatDate(quote.declinedAt)}` : ''}{quote.declineReason ? ` — "${quote.declineReason}"` : ''}.
            </AlertDescription>
          </Alert>
        )}

        {actionError && (
          <Alert className="border-intent-danger/40 bg-intent-danger/10">
            <AlertTriangle className="h-4 w-4 text-intent-danger" />
            <AlertDescription className="text-intent-danger">{actionError}</AlertDescription>
          </Alert>
        )}

        {/* Header row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-content-muted mb-1">Status</p>
              <Badge variant={STATUS_BADGE[quote.status] ?? 'default'} className="text-sm px-3 py-1">
                {quote.status}
              </Badge>
              {quote.expiresAt && !['APPROVED', 'DECLINED', 'CONVERTED'].includes(quote.status) && (
                <p className="text-xs text-content-muted mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />Valid until {formatDate(quote.expiresAt)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-content-muted mb-1">Quote Total</p>
              <p className="font-mono text-2xl font-bold text-intent-gold">{formatCurrency(quote.total)}</p>
              <p className="text-xs text-content-muted mt-1">{quote.billingModel.replace(/_/g, ' ')}</p>
              {quote.nteAmount && (
                <p className="text-xs text-content-muted">NTE cap: {formatCurrency(quote.nteAmount)}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-content-muted mb-1">Deposit Required</p>
              <p className="font-mono text-2xl font-bold text-content-primary">{formatCurrency(quote.depositAmount)}</p>
              <p className="text-xs text-content-muted mt-1">{Math.round(quote.depositPct * 100)}% of total</p>
              <p className="text-xs text-content-muted">Balance: {formatCurrency(quote.total - quote.depositAmount)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Customer + Aircraft */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-xs text-content-muted uppercase tracking-wider">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium text-content-primary">{quote.customer.name}</p>
              {quote.customer.accountNumber && <p className="font-mono text-xs text-content-muted">Acct #{quote.customer.accountNumber}</p>}
              {quote.customer.email && <p className="text-xs text-content-secondary">{quote.customer.email}</p>}
              {quote.customer.phone && <p className="text-xs text-content-secondary">{quote.customer.phone}</p>}
              <p className="text-xs text-content-muted">Terms: {quote.customer.billingTerms.replace(/_/g, ' ')}</p>
            </CardContent>
          </Card>

          {quote.aircraft ? (
            <Card>
              <CardHeader><CardTitle className="text-xs text-content-muted uppercase tracking-wider">Aircraft</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-mono text-xl font-bold text-content-primary">{quote.aircraft.nNumber}</p>
                <p className="text-content-secondary">{quote.aircraft.make} {quote.aircraft.model} {quote.aircraft.year ? `(${quote.aircraft.year})` : ''}</p>
                <p className="font-mono text-xs text-content-muted">S/N: {quote.aircraft.serial}</p>
                {quote.aircraft.ttsn && <p className="text-xs text-content-muted">TTSN: {quote.aircraft.ttsn.toLocaleString()}h</p>}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 pb-6 flex items-center justify-center">
                <p className="text-xs text-content-muted flex items-center gap-2">
                  <Plane className="h-4 w-4" />No aircraft specified
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Line items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Line Items</CardTitle>
              <span className="text-xs text-content-muted">{quote.lines.length} items</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {/* Headers */}
              <div className="grid grid-cols-[100px_1fr_80px_100px_100px] gap-3 text-xs text-content-muted pb-2 border-b border-surface-hover">
                <span>Category</span>
                <span>Description</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Unit Price</span>
                <span className="text-right">Total</span>
              </div>

              {quote.lines.map(line => (
                <div key={line.id} className="grid grid-cols-[100px_1fr_80px_100px_100px] gap-3 py-2 text-sm border-b border-surface-hover/50 last:border-0">
                  <span className={`text-xs font-medium ${CATEGORY_COLOR[line.category] ?? 'text-content-muted'}`}>
                    {line.category.replace(/_/g, ' ')}
                  </span>
                  <span className="text-content-primary">{line.description}</span>
                  <span className="font-mono text-content-secondary text-right">
                    {line.category === 'LABOR' ? `${line.qty}h` : line.qty}
                  </span>
                  <span className="font-mono text-content-secondary text-right">{formatCurrency(line.unitPrice)}</span>
                  <span className="font-mono font-medium text-content-primary text-right">{formatCurrency(line.total)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-surface-hover">
              <div className="grid grid-cols-2 gap-8 max-w-md ml-auto text-sm">
                {laborTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-content-muted">Labor</span>
                    <span className="font-mono">{formatCurrency(laborTotal)}</span>
                  </div>
                )}
                {partsTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-content-muted">Parts</span>
                    <span className="font-mono">{formatCurrency(partsTotal)}</span>
                  </div>
                )}
                {otherTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-content-muted">Other</span>
                    <span className="font-mono">{formatCurrency(otherTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold col-span-2 border-t border-surface-hover pt-2">
                  <span className="text-content-primary">Total</span>
                  <span className="font-mono text-intent-gold text-lg">{formatCurrency(quote.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {quote.notes && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-content-secondary whitespace-pre-wrap">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* History */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Timeline</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              {[
                { label: 'Created', date: quote.createdAt, show: true },
                { label: 'Sent', date: quote.sentAt, show: !!quote.sentAt },
                { label: `Approved by ${quote.approvedBy ?? 'customer'}`, date: quote.approvedAt, show: !!quote.approvedAt },
                { label: 'Declined', date: quote.declinedAt, show: !!quote.declinedAt },
                { label: 'Converted to WO', date: quote.workOrders[0]?.createdAt, show: quote.workOrders.length > 0 },
              ].filter(e => e.show).map(({ label, date }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-surface-active shrink-0" />
                  <span className="text-content-muted">{label}</span>
                  <span className="font-mono text-content-secondary">{date ? formatDate(date) : '—'}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Send Dialog ───────────────────────────────────────── */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Quote to Customer</DialogTitle>
          </DialogHeader>
          {sendResult ? (
            <div className="space-y-4">
              <p className="text-sm text-intent-success flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />{sendResult.message}
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">Approval Link</Label>
                <div className="flex gap-2">
                  <Input value={sendResult.approvalUrl} readOnly className="text-xs font-mono h-8" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0"
                    onClick={() => navigator.clipboard.writeText(sendResult.approvalUrl)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-content-muted">Share this link with {quote.customer.name} so they can review and approve.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-content-secondary">
                This will mark the quote as <strong>SENT</strong> and generate an approval link for{' '}
                <strong>{quote.customer.name}</strong>
                {quote.customer.email ? ` (${quote.customer.email})` : ' (no email on file)'}.
              </p>
              <div className="rounded-lg bg-surface-hover/50 p-3 text-sm space-y-1">
                <p className="text-content-muted text-xs">Quote summary</p>
                <p className="font-mono font-bold text-intent-gold text-lg">{formatCurrency(quote.total)}</p>
                <p className="text-xs text-content-muted">{quote.lines.length} line items · {Math.round(quote.depositPct * 100)}% deposit</p>
              </div>
            </div>
          )}
          <DialogFooter>
            {sendResult ? (
              <Button onClick={() => { setSendOpen(false); setSendResult(null); }}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setSendOpen(false)}>Cancel</Button>
                <Button onClick={handleSend} disabled={sendPending} className="gap-2">
                  {sendPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send Quote
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Approve Dialog ────────────────────────────────────── */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Quote as Approved</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-content-secondary">
              Record customer authorization for {formatCurrency(quote.total)}.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Approved By</Label>
              <Input
                value={approvedBy}
                onChange={e => setApprovedBy(e.target.value)}
                placeholder="e.g. John Smith (verbal), via email…"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={updatePending} className="bg-intent-success hover:bg-intent-success/90 gap-2">
              {updatePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Decline Dialog ────────────────────────────────────── */}
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Quote as Declined</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Reason (optional)</Label>
              <Input
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                placeholder="e.g. Too expensive, went elsewhere…"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)}>Cancel</Button>
            <Button
              onClick={handleDecline}
              disabled={updatePending}
              className="bg-intent-danger hover:bg-intent-danger/90 gap-2"
            >
              {updatePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Mark Declined
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Convert Dialog ────────────────────────────────────── */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Quote to Work Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-surface-hover/50 p-3 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-content-muted">Quoted Total</span>
                <span className="font-mono font-semibold">{formatCurrency(quote.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-content-muted">Deposit Required</span>
                <span className="font-mono">{formatCurrency(quote.depositAmount)}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Deposit Collected ($)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-content-muted">$</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={quote.depositAmount.toFixed(2)}
                  value={depositCollected}
                  onChange={e => setDepositCollected(e.target.value)}
                  className="h-9 text-sm font-mono pl-6"
                />
              </div>
              <p className="text-xs text-content-muted">Leave blank to use the quoted deposit amount.</p>
            </div>
            <p className="text-xs text-content-muted">
              This will create a new work order with billing stage <strong>Stage 3: Authorized</strong> and carry the quoted amount forward for variance tracking.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)}>Cancel</Button>
            <Button onClick={handleConvert} disabled={convertPending} className="gap-2">
              {convertPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Create Work Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Quote Dialog ─────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Quote</DialogTitle>
            <DialogDescription>{quote.quoteNumber} — update terms and notes</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Billing Model</Label>
              <Select value={editBillingModel} onValueChange={setEditBillingModel}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_MODELS.map(m => (
                    <SelectItem key={m} value={m} className="text-xs">{m.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Valid For (days)</Label>
                <Input
                  type="number" min="1"
                  value={editValidDays}
                  onChange={e => setEditValidDays(e.target.value)}
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Deposit %</Label>
                <Input
                  type="number" min="0" max="100"
                  value={editDepositPct}
                  onChange={e => setEditDepositPct(e.target.value)}
                  className="h-8 text-sm font-mono"
                />
              </div>
            </div>
            {editBillingModel === 'NOT_TO_EXCEED' && (
              <div className="space-y-1.5">
                <Label className="text-xs">NTE Cap ($)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={editNte}
                  onChange={e => setEditNte(e.target.value)}
                  className="h-8 text-sm font-mono"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Scope of work, exclusions, assumptions…"
                className="text-sm min-h-[72px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              disabled={editPending}
              onClick={async () => {
                setEditPending(true);
                try {
                  await updateQuote({
                    billingModel: editBillingModel,
                    validDays: editValidDays ? parseInt(editValidDays) : undefined,
                    depositPct: editDepositPct ? parseFloat(editDepositPct) / 100 : undefined,
                    nteAmount: editNte ? parseFloat(editNte) : undefined,
                    notes: editNotes || undefined,
                  });
                  setEditOpen(false);
                } finally {
                  setEditPending(false);
                }
              }}
              className="gap-2"
            >
              {editPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
