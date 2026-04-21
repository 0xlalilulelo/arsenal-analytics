'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { FileText, Plus, ExternalLink, Loader2, XCircle, Download } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';
import { hasRole } from '@/lib/rbac';

// ─── Types ────────────────────────────────────────────────────────────────────

type DocType = 'FORM_337' | 'CERT_8130_3' | 'MAINT_RELEASE' | 'LOGBOOK_ENTRY' | 'PARTS_TAG';

const DOC_TYPE_LABELS: Record<DocType, string> = {
  FORM_337:      'FAA Form 337 — Major Repair & Alteration',
  CERT_8130_3:   'FAA Form 8130-3 — Authorized Release',
  MAINT_RELEASE: 'Maintenance Release / Return to Service',
  LOGBOOK_ENTRY: 'Aircraft Logbook Entry',
  PARTS_TAG:     'Parts Condition Tag',
};

const DOC_TYPE_SHORT: Record<DocType, string> = {
  FORM_337:      'Form 337',
  CERT_8130_3:   '8130-3',
  MAINT_RELEASE: 'Maint. Release',
  LOGBOOK_ENTRY: 'Logbook Entry',
  PARTS_TAG:     'Parts Tag',
};

interface Doc {
  id: string;
  type: DocType;
  documentNumber: string;
  status: 'DRAFT' | 'ISSUED' | 'VOID';
  pdfUrl: string | null;
  issuedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  issuedBy: { name: string | null } | null;
}

interface ComplianceItem {
  id: string;
  type: string;
  referenceId: string;
  description: string;
}

interface PartRequest {
  id: string;
  partNumber: string;
  description: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DocumentsTabProps {
  workOrderId: string;
  complianceItems?: ComplianceItem[];
  partRequests?: PartRequest[];
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useDocuments(workOrderId: string) {
  return useQuery<Doc[]>({
    queryKey: ['wo-documents', workOrderId],
    queryFn: async () => {
      const res = await fetch(`/api/work-orders/${workOrderId}/documents`);
      const json = await res.json() as { data: Doc[] };
      return json.data;
    },
  });
}

function useGenerateDocument(workOrderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      type: DocType;
      complianceItemId?: string;
      partRequestId?: string;
      additionalNotes?: string;
    }) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Failed to generate document');
      }
      return (await res.json() as { data: Doc }).data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wo-documents', workOrderId] }); },
  });
}

function useVoidDocument(workOrderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, voidReason }: { id: string; voidReason: string }) => {
      const res = await fetch(`/api/documents/${id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voidReason }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Failed to void document');
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wo-documents', workOrderId] }); },
  });
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'ISSUED'
    ? 'bg-intent-success/15 text-intent-success border-intent-success/30'
    : status === 'VOID'
    ? 'bg-intent-danger/15 text-intent-danger border-intent-danger/30'
    : 'bg-surface-secondary text-content-muted border-border-muted';
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

// ─── Generate dialog ──────────────────────────────────────────────────────────

interface GenerateDialogProps {
  open: boolean;
  onClose: () => void;
  workOrderId: string;
  complianceItems: ComplianceItem[];
  partRequests: PartRequest[];
}

const PART_REQUIRED_TYPES: DocType[] = ['CERT_8130_3', 'PARTS_TAG'];
const COMPLIANCE_REQUIRED_TYPES: DocType[] = ['FORM_337'];

function GenerateDialog({ open, onClose, workOrderId, complianceItems, partRequests }: GenerateDialogProps) {
  const [docType, setDocType] = useState<DocType>('MAINT_RELEASE');
  const [complianceItemId, setComplianceItemId] = useState('');
  const [partRequestId, setPartRequestId] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [error, setError] = useState('');

  const generate = useGenerateDocument(workOrderId);

  const needsCompliance = COMPLIANCE_REQUIRED_TYPES.includes(docType);
  const needsPart = PART_REQUIRED_TYPES.includes(docType);

  async function handleGenerate() {
    setError('');
    if (needsCompliance && !complianceItemId) {
      setError('Select a compliance item for this document type.');
      return;
    }
    if (needsPart && !partRequestId) {
      setError('Select a part request for this document type.');
      return;
    }
    try {
      const doc = await generate.mutateAsync({
        type: docType,
        complianceItemId: complianceItemId || undefined,
        partRequestId:    partRequestId || undefined,
        additionalNotes:  additionalNotes || undefined,
      });
      if (doc.pdfUrl) window.open(doc.pdfUrl, '_blank');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate FAA Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Document type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Document Type</Label>
            <Select value={docType} onValueChange={v => setDocType(v as DocType)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map(t => (
                  <SelectItem key={t} value={t} className="text-sm">
                    {DOC_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Compliance item picker */}
          {needsCompliance && (
            <div className="space-y-1.5">
              <Label className="text-xs">Compliance Item <span className="text-intent-danger">*</span></Label>
              {complianceItems.length === 0 ? (
                <p className="text-xs text-content-muted">No compliance items on this work order.</p>
              ) : (
                <Select value={complianceItemId} onValueChange={setComplianceItemId}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select compliance item…" />
                  </SelectTrigger>
                  <SelectContent>
                    {complianceItems.map(ci => (
                      <SelectItem key={ci.id} value={ci.id} className="text-sm">
                        {ci.type} {ci.referenceId} — {ci.description.slice(0, 50)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Part request picker */}
          {needsPart && (
            <div className="space-y-1.5">
              <Label className="text-xs">Part Request <span className="text-intent-danger">*</span></Label>
              {partRequests.length === 0 ? (
                <p className="text-xs text-content-muted">No part requests on this work order.</p>
              ) : (
                <Select value={partRequestId} onValueChange={setPartRequestId}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select part request…" />
                  </SelectTrigger>
                  <SelectContent>
                    {partRequests.map(pr => (
                      <SelectItem key={pr.id} value={pr.id} className="text-sm">
                        {pr.partNumber} — {pr.description.slice(0, 40)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Notes */}
          {(docType === 'LOGBOOK_ENTRY' || docType === 'CERT_8130_3' || docType === 'PARTS_TAG') && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                {docType === 'LOGBOOK_ENTRY' ? 'Work Description' : 'Remarks / Notes'}{' '}
                <span className="text-content-muted">(optional)</span>
              </Label>
              <Textarea
                className="text-sm min-h-16"
                value={additionalNotes}
                onChange={e => setAdditionalNotes(e.target.value)}
                placeholder={docType === 'LOGBOOK_ENTRY' ? 'Describe the work performed…' : 'Additional remarks…'}
              />
            </div>
          )}

          {error && <p className="text-xs text-intent-danger">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={generate.isPending}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={generate.isPending} className="gap-1.5">
            {generate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            {generate.isPending ? 'Generating PDF…' : 'Generate & Open'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Void dialog ──────────────────────────────────────────────────────────────

function VoidDialog({ doc, onClose }: { doc: Doc | null; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const voidMutation = useVoidDocument(doc?.id ?? '');

  async function handleVoid() {
    if (!doc || !reason.trim()) return;
    await voidMutation.mutateAsync({ id: doc.id, voidReason: reason });
    onClose();
  }

  return (
    <AlertDialog open={!!doc} onOpenChange={v => { if (!v) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Void Document</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark <strong>{doc?.documentNumber}</strong> as VOID. The PDF is retained for audit purposes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2 space-y-1.5">
          <Label className="text-xs">Reason for voiding <span className="text-intent-danger">*</span></Label>
          <Input
            className="text-sm"
            placeholder="e.g. Incorrect squawk reference — reissued as 337-2026-0002"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-intent-danger hover:bg-intent-danger/90 text-white"
            onClick={handleVoid}
            disabled={!reason.trim() || voidMutation.isPending}
          >
            {voidMutation.isPending ? 'Voiding…' : 'Void Document'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DocumentsTab({ workOrderId, complianceItems = [], partRequests = [] }: DocumentsTabProps) {
  const { data: docs = [], isLoading } = useDocuments(workOrderId);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [voidDoc, setVoidDoc] = useState<Doc | null>(null);
  const currentUser = useCurrentUser();
  const canGenerate = hasRole(currentUser?.role, 'MANAGER');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-content-secondary">
          {docs.length} document{docs.length !== 1 ? 's' : ''} generated
        </p>
        {canGenerate && (
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setGenerateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />Generate Document
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-8 text-sm text-content-muted justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />Loading…
        </div>
      )}

      {!isLoading && docs.length === 0 && (
        <div className="rounded-lg border border-surface-hover p-8 text-center text-sm text-content-muted">
          No documents generated yet.{canGenerate ? ' Click "Generate Document" to create an FAA form or release.' : ''}
        </div>
      )}

      {docs.map(doc => (
        <div key={doc.id} className={`rounded-lg border p-4 ${doc.status === 'VOID' ? 'border-surface-hover opacity-60' : 'border-surface-hover bg-surface-card'}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-xs rounded-md border border-border-muted bg-surface-secondary px-2 py-0.5">{doc.documentNumber}</span>
                <span className="text-xs text-content-secondary">{DOC_TYPE_SHORT[doc.type]}</span>
                <StatusBadge status={doc.status} />
              </div>
              <p className="text-sm text-content-primary font-medium">{DOC_TYPE_LABELS[doc.type]}</p>
              {doc.issuedAt && (
                <p className="text-xs text-content-muted mt-0.5">
                  Issued {formatDate(doc.issuedAt)}{doc.issuedBy?.name ? ` by ${doc.issuedBy.name}` : ''}
                </p>
              )}
              {doc.status === 'VOID' && doc.voidReason && (
                <p className="text-xs text-intent-danger mt-1">Voided: {doc.voidReason}</p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {doc.pdfUrl && (
                <Button
                  variant="outline" size="sm" className="h-7 text-xs gap-1"
                  onClick={() => window.open(doc.pdfUrl!, '_blank')}
                >
                  <Download className="h-3 w-3" />PDF
                </Button>
              )}
              {doc.status === 'ISSUED' && canGenerate && (
                <Button
                  variant="ghost" size="sm" className="h-7 w-7 p-0 text-content-muted hover:text-intent-danger"
                  onClick={() => setVoidDoc(doc)}
                  title="Void document"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}

      <GenerateDialog
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        workOrderId={workOrderId}
        complianceItems={complianceItems}
        partRequests={partRequests}
      />
      <VoidDialog doc={voidDoc} onClose={() => setVoidDoc(null)} />
    </div>
  );
}
