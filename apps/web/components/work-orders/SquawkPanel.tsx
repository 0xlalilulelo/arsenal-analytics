'use client';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { useSquawkApproval } from '@/hooks/useWorkOrders';
import { CheckCircle2, XCircle, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

export interface Squawk {
  id: string;
  description: string;
  estLaborHours: number | null;
  estPartsTotal: number | null;
  estTotal: number | null;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'DECLINED' | 'DEFERRED';
  isAirworthiness: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

interface SquawkPanelProps {
  open: boolean;
  onClose: () => void;
  squawks: Squawk[];
  workOrderNumber: string;
  workOrderId: string;
}

function SquawkCard({ squawk, onApprove, onDecline, onDefer }: {
  squawk: Squawk;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  onDefer: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={`rounded-lg border p-4 ${
      squawk.status === 'APPROVED' ? 'border-intent-success/30 bg-intent-success/5' :
      squawk.status === 'DECLINED' ? 'border-surface-hover bg-surface-card/50' :
      squawk.isAirworthiness ? 'border-intent-danger/50 bg-intent-danger/5' :
      'border-intent-warning/30 bg-intent-warning/5'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {squawk.isAirworthiness && (
              <span className="flex items-center gap-1 text-xs font-semibold text-intent-danger">
                <AlertTriangle className="h-3 w-3" />
                AIRWORTHINESS
              </span>
            )}
            <Badge variant={
              squawk.status === 'APPROVED' ? 'complete' :
              squawk.status === 'DECLINED' ? 'closed' :
              squawk.status === 'DEFERRED' ? 'awaiting-approval' :
              'awaiting-approval'
            }>
              {squawk.status.replace('_', ' ')}
            </Badge>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-start gap-2 mt-2 text-left"
          >
            <p className="text-sm text-content-primary font-medium flex-1">{squawk.description}</p>
            {expanded ? <ChevronUp className="h-4 w-4 text-content-muted shrink-0 mt-0.5" /> : <ChevronDown className="h-4 w-4 text-content-muted shrink-0 mt-0.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Cost estimate */}
          {(squawk.estLaborHours || squawk.estPartsTotal) && (
            <div className="grid grid-cols-3 gap-2 rounded bg-surface-card p-2.5 text-xs">
              <div>
                <p className="text-content-muted">Labor</p>
                <p className="font-mono font-semibold text-content-primary">
                  {squawk.estLaborHours ? `${squawk.estLaborHours}h` : '—'}
                </p>
              </div>
              <div>
                <p className="text-content-muted">Parts Est.</p>
                <p className="font-mono font-semibold text-content-primary">
                  {squawk.estPartsTotal ? formatCurrency(squawk.estPartsTotal) : '—'}
                </p>
              </div>
              <div>
                <p className="text-content-muted">Total Est.</p>
                <p className="font-mono font-semibold text-intent-gold">
                  {squawk.estTotal ? formatCurrency(squawk.estTotal) : '—'}
                </p>
              </div>
            </div>
          )}

          {/* Approval info */}
          {squawk.status === 'APPROVED' && squawk.approvedBy && (
            <p className="text-xs text-intent-success flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approved by {squawk.approvedBy}
            </p>
          )}

          {/* Actions */}
          {squawk.status === 'PENDING_APPROVAL' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="success"
                className="flex-1 gap-1 h-8 text-xs"
                onClick={() => onApprove(squawk.id)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1 h-8 text-xs text-content-muted"
                onClick={() => onDecline(squawk.id)}
              >
                <XCircle className="h-3.5 w-3.5" />
                Decline
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 h-8 text-xs text-content-muted"
                onClick={() => onDefer(squawk.id)}
              >
                <Clock className="h-3.5 w-3.5" />
                Defer
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SquawkPanel({ open, onClose, squawks, workOrderNumber, workOrderId }: SquawkPanelProps) {
  const [localSquawks, setLocalSquawks] = useState(squawks);
  const [sentRequest, setSentRequest] = useState(false);
  const { mutateAsync: updateSquawk } = useSquawkApproval(workOrderId);

  useEffect(() => { setLocalSquawks(squawks); }, [squawks]);

  const pendingCount = localSquawks.filter(s => s.status === 'PENDING_APPROVAL').length;
  const airworthinessCount = localSquawks.filter(s => s.isAirworthiness && s.status === 'PENDING_APPROVAL').length;

  const handleApprove = async (id: string) => {
    setLocalSquawks(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'APPROVED' as const, approvedBy: 'Customer (verbal)', approvedAt: new Date().toISOString() } : s,
    ));
    try {
      await updateSquawk({ squawkId: id, status: 'APPROVED', approvedBy: 'Customer (verbal)' });
    } catch {
      setLocalSquawks(squawks);
    }
  };

  const handleDecline = async (id: string) => {
    setLocalSquawks(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'DECLINED' as const } : s,
    ));
    try {
      await updateSquawk({ squawkId: id, status: 'DECLINED' });
    } catch {
      setLocalSquawks(squawks);
    }
  };

  const handleDefer = async (id: string) => {
    setLocalSquawks(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'DEFERRED' as const } : s,
    ));
    try {
      await updateSquawk({ squawkId: id, status: 'DEFERRED' });
    } catch {
      setLocalSquawks(squawks);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Squawk Approvals</SheetTitle>
          <SheetDescription>
            {workOrderNumber} · {pendingCount} pending approval
            {airworthinessCount > 0 && (
              <span className="ml-2 text-intent-danger font-semibold">
                {airworthinessCount} airworthiness item{airworthinessCount > 1 ? 's' : ''}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3">
          {localSquawks.length === 0 && (
            <p className="text-sm text-content-muted py-8 text-center">No squawks recorded for this work order.</p>
          )}
          {localSquawks.map(squawk => (
            <SquawkCard
              key={squawk.id}
              squawk={squawk}
              onApprove={handleApprove}
              onDecline={handleDecline}
              onDefer={handleDefer}
            />
          ))}
        </div>

        {pendingCount > 0 && (
          <div className="mt-6 pt-4 border-t border-surface-hover">
            <p className="text-xs text-content-muted mb-3">
              Aircraft cannot return to service while airworthiness squawks remain unapproved.
            </p>
            <Button
              className="w-full"
              size="sm"
              variant={sentRequest ? 'outline' : 'default'}
              onClick={() => {
                const pending = localSquawks.filter(s => s.status === 'PENDING_APPROVAL');
                const lines = pending.map((s, i) =>
                  `${i + 1}. ${s.description}${s.estTotal ? ` (est. $${s.estTotal.toFixed(2)})` : ''}`
                ).join('\n');
                const subject = encodeURIComponent(`Squawk Approval Required — ${workOrderNumber}`);
                const body = encodeURIComponent(
                  `Please review and approve the following squawks for work order ${workOrderNumber}:\n\n${lines}\n\nPlease reply to authorize the work.`
                );
                window.open(`mailto:?subject=${subject}&body=${body}`);
                setSentRequest(true);
              }}
            >
              {sentRequest ? 'Approval Request Sent' : 'Send Approval Request to Customer'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
