'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useQuotes, type QuoteStatus } from '@/hooks/useQuotes';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, FileText, Loader2, ArrowRight, Clock, CheckCircle2, XCircle, Send } from 'lucide-react';

const STATUS_FILTERS: Array<{ value: QuoteStatus | 'ALL'; label: string }> = [
  { value: 'ALL',       label: 'All' },
  { value: 'DRAFT',     label: 'Draft' },
  { value: 'SENT',      label: 'Sent' },
  { value: 'APPROVED',  label: 'Approved' },
  { value: 'DECLINED',  label: 'Declined' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'EXPIRED',   label: 'Expired' },
];

const STATUS_VARIANT: Record<string, 'draft' | 'sent' | 'inspection' | 'aog' | 'closed' | 'default'> = {
  DRAFT:     'draft',
  SENT:      'sent',
  VIEWED:    'sent',
  APPROVED:  'inspection',
  DECLINED:  'aog',
  EXPIRED:   'aog',
  CONVERTED: 'closed',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  DRAFT:     <FileText className="h-3 w-3" />,
  SENT:      <Send className="h-3 w-3" />,
  VIEWED:    <Send className="h-3 w-3" />,
  APPROVED:  <CheckCircle2 className="h-3 w-3" />,
  DECLINED:  <XCircle className="h-3 w-3" />,
  EXPIRED:   <Clock className="h-3 w-3" />,
  CONVERTED: <ArrowRight className="h-3 w-3" />,
};

export default function QuotesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'ALL'>('ALL');

  const { data, isLoading } = useQuotes({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    search: search || undefined,
  });
  const quotes = data?.data ?? [];

  const draftCount    = quotes.filter(q => q.status === 'DRAFT').length;
  const approvedCount = quotes.filter(q => q.status === 'APPROVED').length;
  const sentCount     = quotes.filter(q => ['SENT', 'VIEWED'].includes(q.status)).length;
  const totalValue    = quotes.reduce((s, q) => s + q.total, 0);

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Quotes & Estimates"
        subtitle="Pre-authorization cost estimates"
        actions={
          <Link href="/quotes/new">
            <Button size="sm" className="h-8 text-xs gap-1">
              <Plus className="h-3.5 w-3.5" />New Quote
            </Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Summary tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Pipeline Value', value: formatCurrency(totalValue), color: 'text-intent-gold' },
            { label: 'Awaiting Response', value: sentCount, color: 'text-intent-warning' },
            { label: 'Approved', value: approvedCount, color: 'text-intent-success' },
            { label: 'Drafts', value: draftCount, color: 'text-content-secondary' },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-content-muted">{label}</p>
                <p className={`font-mono text-2xl font-bold mt-1 ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted" />
            <Input
              placeholder="Search quote #, customer, N-number…"
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                  statusFilter === f.value
                    ? 'bg-intent-primary/20 border-intent-primary text-intent-primary'
                    : 'border-surface-hover text-content-muted hover:text-content-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
          </div>
        )}

        {!isLoading && quotes.length === 0 && (
          <div className="rounded-lg border border-surface-hover p-16 text-center">
            <FileText className="h-8 w-8 text-content-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-content-primary mb-1">No Quotes Found</p>
            <p className="text-xs text-content-muted mb-4">
              {statusFilter === 'ALL' ? 'Create your first quote to get started.' : `No quotes with status "${statusFilter}".`}
            </p>
            <Link href="/quotes/new">
              <Button size="sm" className="h-8 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" />New Quote
              </Button>
            </Link>
          </div>
        )}

        <div className="space-y-2">
          {quotes.map(quote => (
            <Link key={quote.id} href={`/quotes/${quote.id}`}>
              <div className="rounded-lg border border-surface-hover bg-surface-card p-4 hover:border-surface-active transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={STATUS_VARIANT[quote.status] ?? 'default'} className="flex items-center gap-1 text-xs">
                        {STATUS_ICON[quote.status]}
                        {quote.status}
                      </Badge>
                      <span className="font-mono text-sm font-bold text-content-primary">{quote.quoteNumber}</span>
                      {quote.aircraft && (
                        <span className="font-mono text-xs text-content-muted">{quote.aircraft.nNumber}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-content-primary">{quote.customer.name}</p>
                    {quote.aircraft && (
                      <p className="text-xs text-content-muted">{quote.aircraft.make} {quote.aircraft.model}</p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-mono text-xl font-bold text-intent-gold">{formatCurrency(quote.total)}</p>
                    {quote.depositAmount > 0 && (
                      <p className="text-xs text-content-muted">{formatCurrency(quote.depositAmount)} deposit req.</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 justify-end">
                      <span className="text-xs text-content-muted">{quote._count.lines} line{quote._count.lines !== 1 ? 's' : ''}</span>
                      {quote.expiresAt && (
                        <span className="text-xs text-content-muted">
                          {quote.status === 'EXPIRED' ? 'Expired ' : 'Exp. '}{formatDate(quote.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Approved + not yet converted: show CTA */}
                {quote.status === 'APPROVED' && quote._count.workOrders === 0 && (
                  <div className="mt-3 pt-3 border-t border-surface-hover flex items-center justify-between">
                    <span className="text-xs text-intent-success flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Approved{quote.approvedBy ? ` by ${quote.approvedBy}` : ''}{quote.approvedAt ? ` on ${formatDate(quote.approvedAt)}` : ''}
                    </span>
                    <span className="text-xs font-medium text-intent-primary flex items-center gap-1">
                      Convert to Work Order <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                )}

                {quote.status === 'CONVERTED' && quote._count.workOrders > 0 && (
                  <div className="mt-3 pt-3 border-t border-surface-hover">
                    <span className="text-xs text-content-muted flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" />Converted to work order
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
