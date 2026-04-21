'use client';
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export interface InstallLotPickerPart {
  id: string;
  partNumber: string;
  description: string;
  qty: number;
  condition: string;
  requires8130: boolean;
}

interface EligibleLot {
  id: string;
  serialNumber: string | null;
  lotNumber: string | null;
  batchNumber: string | null;
  revision: string | null;
  qtyOnHand: number;
  mfgDate: string | null;
  expirationDate: string | null;
  cocDocUrl: string | null;
  form8130Url: string | null;
  createdAt: string;
  verdict:
    | { status: 'ok' }
    | { status: 'warn'; daysUntilExpiration: number }
    | { status: 'block'; reason: 'EXPIRED' | 'NO_QUANTITY' };
  sufficientQty: boolean;
}

export function InstallLotPicker({
  workOrderId, partRequest, onClose, onInstalled,
}: {
  workOrderId: string;
  partRequest: InstallLotPickerPart | null;
  onClose: () => void;
  onInstalled?: () => void;
}) {
  const qc = useQueryClient();
  const open = !!partRequest;
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['eligible-lots', workOrderId, partRequest?.id],
    queryFn: async () => {
      const res = await fetch(`/api/work-orders/${workOrderId}/parts/${partRequest!.id}/eligible-lots`);
      if (!res.ok) throw new Error('Failed to load lots');
      return res.json() as Promise<{
        data: EligibleLot[];
        requiredQty: number;
        requires8130: boolean;
      }>;
    },
    enabled: open,
  });

  const lots = data?.data ?? [];

  const { mutateAsync: install, isPending } = useMutation({
    mutationFn: async () => {
      if (partRequest!.requires8130 && !selectedLotId) {
        throw new Error('Select a lot before installing — 8130-3 traceability required.');
      }
      const res = await fetch(`/api/work-orders/${workOrderId}/parts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partRequestId: partRequest!.id,
          status: 'INSTALLED',
          partLotId: selectedLotId,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to install part');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-order', workOrderId] });
      qc.invalidateQueries({ queryKey: ['eligible-lots', workOrderId, partRequest?.id] });
      setSelectedLotId(null);
      setError('');
      onInstalled?.();
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  const handleClose = () => {
    setSelectedLotId(null);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Install Part — Pick Lot</DialogTitle>
          {partRequest && (
            <DialogDescription>
              <span className="font-mono">{partRequest.partNumber}</span> · {partRequest.description} · Qty needed:{' '}
              <span className="font-mono font-semibold">{partRequest.qty}</span> · {partRequest.condition}
              {partRequest.requires8130 && (
                <span className="ml-2 inline-flex items-center gap-1 text-intent-warning">
                  <AlertTriangle className="h-3 w-3" />8130-3 traceability required
                </span>
              )}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="py-2">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
          ) : lots.length === 0 ? (
            <div className="rounded-md border border-intent-warning/40 bg-intent-warning/5 p-4 text-xs">
              <p className="font-semibold text-intent-warning mb-1">No eligible lots available</p>
              <p className="text-content-muted">
                No traceable lots on hand match this part{partRequest ? ` (${partRequest.partNumber} / ${partRequest.condition}, qty ≥ ${partRequest.qty})` : ''} and pass expiration checks.
                Receive this part against a PO or add a lot manually on the part&apos;s detail page.
              </p>
              {partRequest?.requires8130 === false && (
                <p className="mt-2 text-content-muted">
                  This part does not require 8130-3 traceability, so you can install without a lot — click &quot;Install without lot&quot; below.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {lots.map(lot => {
                const selected = selectedLotId === lot.id;
                const warn = lot.verdict.status === 'warn';
                return (
                  <button
                    key={lot.id}
                    onClick={() => setSelectedLotId(lot.id)}
                    className={`w-full text-left rounded-md border p-3 text-xs transition-colors ${
                      selected
                        ? 'border-intent-primary bg-intent-primary/10'
                        : 'border-surface-hover hover:bg-surface-hover/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-mono space-y-0.5">
                        {lot.serialNumber && <div>SN <span className="font-semibold">{lot.serialNumber}</span></div>}
                        {lot.lotNumber && <div className="text-content-muted">Lot {lot.lotNumber}</div>}
                        {lot.batchNumber && <div className="text-content-muted">Batch {lot.batchNumber}</div>}
                        {lot.revision && <div className="text-content-muted">Rev {lot.revision}</div>}
                      </div>
                      <div className="text-right space-y-0.5">
                        <div className="font-mono">
                          Qty on hand: <span className="font-semibold">{lot.qtyOnHand}</span>
                        </div>
                        {lot.mfgDate && (
                          <div className="text-content-muted">Mfg {formatDate(lot.mfgDate)}</div>
                        )}
                        {lot.expirationDate && (
                          <div className={warn ? 'text-intent-warning' : 'text-content-muted'}>
                            {warn && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
                            Expires {formatDate(lot.expirationDate)}
                            {warn && ` (${lot.verdict.status === 'warn' ? lot.verdict.daysUntilExpiration : 0}d)`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {lot.form8130Url && (
                        <Badge variant="complete" className="text-[10px] gap-0.5">
                          <FileText className="h-2.5 w-2.5" />8130
                        </Badge>
                      )}
                      {lot.cocDocUrl && (
                        <Badge variant="default" className="text-[10px] gap-0.5">
                          <FileText className="h-2.5 w-2.5" />CoC
                        </Badge>
                      )}
                      {selected && (
                        <span className="ml-auto inline-flex items-center gap-1 text-intent-primary font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" />Selected
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-intent-danger">{error}</p>}

        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          {partRequest && !partRequest.requires8130 && (
            <Button
              variant="outline" size="sm" className="h-8 text-xs"
              onClick={() => install()}
              disabled={isPending}
              title="Install without attaching a lot (allowed because 8130-3 is not required)"
            >
              {isPending && !selectedLotId && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Install without lot
            </Button>
          )}
          <Button
            size="sm" className="h-8 text-xs gap-1.5"
            onClick={() => install()}
            disabled={isPending || !selectedLotId}
          >
            {isPending && selectedLotId && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Install from selected lot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
