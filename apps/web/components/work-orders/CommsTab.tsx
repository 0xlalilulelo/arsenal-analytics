'use client';
import { useState } from 'react';
import { useWorkOrderComms, useCreateComm, useUpdateComm, useDeleteComm, type WorkOrderComm, type CreateCommInput } from '@/hooks/useWorkOrderCommunications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Mail, Plus, Copy, Check, ArrowDownLeft, ArrowUpRight, Loader2, MailCheck, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';
import { hasRole } from '@/lib/rbac';

const STATUS_LABELS: Record<string, string> = {
  AWAITING_REPLY: 'Awaiting Reply',
  REPLIED: 'Replied',
  RESOLVED: 'Resolved',
  INFO_ONLY: 'FYI Only',
};

const STATUS_COLORS: Record<string, string> = {
  AWAITING_REPLY: 'bg-intent-warning/15 text-intent-warning border-intent-warning/30',
  REPLIED: 'bg-intent-info/15 text-intent-info border-intent-info/30',
  RESOLVED: 'bg-intent-success/15 text-intent-success border-intent-success/30',
  INFO_ONLY: 'bg-surface-secondary text-content-muted border-border-muted',
};

interface LogDialogState {
  open: boolean;
  editing: WorkOrderComm | null;
}

const EMPTY_FORM: CreateCommInput = {
  subject: '',
  direction: 'INBOUND',
  status: 'AWAITING_REPLY',
  contactName: '',
  contactEmail: '',
  notes: '',
};

export function CommsTab({
  workOrderId,
  workOrderNumber,
  customerEmail,
}: {
  workOrderId: string;
  workOrderNumber: string;
  customerEmail?: string | null;
}) {
  const { data, isLoading } = useWorkOrderComms(workOrderId);
  const createComm = useCreateComm(workOrderId);
  const updateComm = useUpdateComm(workOrderId);
  const deleteComm = useDeleteComm(workOrderId);
  const { user } = useCurrentUser();

  const canDelete = hasRole(user?.role, 'MANAGER');

  const [dialog, setDialog] = useState<LogDialogState>({ open: false, editing: null });
  const [form, setForm] = useState<CreateCommInput>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tagCopied, setTagCopied] = useState(false);

  const tag = `[${workOrderNumber}]`;

  function openCreate() {
    setForm(EMPTY_FORM);
    setDialog({ open: true, editing: null });
  }

  function openEdit(comm: WorkOrderComm) {
    setForm({
      subject: comm.subject,
      direction: comm.direction,
      status: comm.status,
      contactName: comm.contactName ?? '',
      contactEmail: comm.contactEmail ?? '',
      notes: comm.notes ?? '',
    });
    setDialog({ open: true, editing: comm });
  }

  async function handleSave() {
    if (!form.subject.trim()) return;
    const payload = {
      ...form,
      contactName: form.contactName || undefined,
      contactEmail: form.contactEmail || undefined,
      notes: form.notes || undefined,
    };
    if (dialog.editing) {
      await updateComm.mutateAsync({ comId: dialog.editing.id, ...payload });
    } else {
      await createComm.mutateAsync(payload);
    }
    setDialog({ open: false, editing: null });
  }

  async function handleQuickStatus(comm: WorkOrderComm, status: WorkOrderComm['status']) {
    await updateComm.mutateAsync({ comId: comm.id, status });
  }

  function copyTag() {
    navigator.clipboard.writeText(tag);
    setTagCopied(true);
    setTimeout(() => setTagCopied(false), 2000);
  }

  // Auto-set status default when direction changes
  function handleDirectionChange(dir: 'INBOUND' | 'OUTBOUND') {
    setForm(f => ({
      ...f,
      direction: dir,
      status: f.status === EMPTY_FORM.status
        ? (dir === 'INBOUND' ? 'AWAITING_REPLY' : 'REPLIED')
        : f.status,
    }));
  }

  const comms = data?.data ?? [];

  return (
    <div className="space-y-4 pt-2">
      {/* WO Reference Tag */}
      <div className="rounded-lg border border-border-muted bg-surface-secondary p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-content-secondary mb-1">WO Reference Tag</p>
            <p className="text-xs text-content-muted">
              Paste into email subjects for instant inbox filtering — e.g.{' '}
              <span className="font-mono text-content-secondary">subject:{tag}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <code className="rounded bg-surface-primary border border-border-muted px-3 py-1.5 font-mono text-sm font-medium text-content-primary">
              {tag}
            </code>
            <Button size="sm" variant="outline" onClick={copyTag} className="gap-1.5">
              {tagCopied ? <Check className="h-3.5 w-3.5 text-intent-success" /> : <Copy className="h-3.5 w-3.5" />}
              {tagCopied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-content-primary">Email Threads</h3>
          {(data?.pendingCount ?? 0) > 0 && (
            <Badge variant="overdue" className="text-xs h-5 px-1.5">
              {data!.pendingCount} pending
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />Log Thread
        </Button>
      </div>

      {/* Thread list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-content-muted">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />Loading…
        </div>
      ) : comms.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-muted p-10 text-center">
          <Mail className="h-8 w-8 mx-auto mb-3 text-content-muted/50" />
          <p className="text-sm font-medium text-content-secondary mb-1">No threads logged yet</p>
          <p className="text-xs text-content-muted mb-4 max-w-xs mx-auto">
            Copy the reference tag above, add it to your email subjects, then log threads here to track what needs a reply.
          </p>
          <Button size="sm" variant="outline" onClick={openCreate} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />Log first thread
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {comms.map(comm => (
            <CommCard
              key={comm.id}
              comm={comm}
              expanded={expandedId === comm.id}
              canDelete={canDelete}
              isUpdating={updateComm.isPending}
              onToggle={() => setExpandedId(prev => prev === comm.id ? null : comm.id)}
              onEdit={() => openEdit(comm)}
              onDelete={() => setDeleteId(comm.id)}
              onMarkReplied={() => handleQuickStatus(comm, 'REPLIED')}
              onMarkResolved={() => handleQuickStatus(comm, 'RESOLVED')}
            />
          ))}
        </div>
      )}

      {/* Log / Edit dialog */}
      <Dialog open={dialog.open} onOpenChange={open => { if (!open) setDialog({ open: false, editing: null }); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog.editing ? 'Edit Thread' : 'Log Email Thread'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Subject <span className="text-intent-error">*</span></Label>
              <Input
                className="mt-1.5"
                placeholder="Paste or type the email subject line"
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Direction</Label>
                <div className="mt-1.5 flex rounded-md border border-border-muted overflow-hidden">
                  {(['INBOUND', 'OUTBOUND'] as const).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleDirectionChange(d)}
                      className={`flex-1 py-2 text-xs font-medium transition-colors ${
                        form.direction === d
                          ? 'bg-brand-primary text-white'
                          : 'bg-surface-primary text-content-secondary hover:bg-surface-secondary'
                      }`}
                    >
                      {d === 'INBOUND' ? '← Received' : 'Sent →'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as CreateCommInput['status'] }))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AWAITING_REPLY">Awaiting Reply</SelectItem>
                    <SelectItem value="REPLIED">Replied</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="INFO_ONLY">FYI Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Contact name</Label>
                <Input
                  className="mt-1.5"
                  placeholder={customerEmail ? 'Customer / vendor' : 'Optional'}
                  value={form.contactName}
                  onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Contact email</Label>
                <Input
                  className="mt-1.5"
                  type="email"
                  placeholder={customerEmail ?? 'Optional'}
                  value={form.contactEmail}
                  onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Notes <span className="text-content-muted">(key info, action needed, paste excerpt)</span></Label>
              <Textarea
                className="mt-1.5 text-sm"
                rows={4}
                placeholder="e.g. 'Vendor confirmed part ships Thursday, need to verify serial matches customer record'"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                maxLength={2000}
              />
              <p className="text-right text-xs text-content-muted mt-0.5">{(form.notes ?? '').length}/2000</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, editing: null })}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!form.subject.trim() || createComm.isPending || updateComm.isPending}
              className="gap-1.5"
            >
              {(createComm.isPending || updateComm.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {dialog.editing ? 'Save Changes' : 'Log Thread'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete thread entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the communication log entry permanently. The original emails are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-intent-error text-white hover:bg-intent-error/90"
              onClick={async () => {
                if (deleteId) await deleteComm.mutateAsync(deleteId);
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CommCard({
  comm, expanded, canDelete, isUpdating,
  onToggle, onEdit, onDelete, onMarkReplied, onMarkResolved,
}: {
  comm: WorkOrderComm;
  expanded: boolean;
  canDelete: boolean;
  isUpdating: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMarkReplied: () => void;
  onMarkResolved: () => void;
}) {
  return (
    <div className={`rounded-lg border transition-colors ${
      comm.status === 'AWAITING_REPLY'
        ? 'border-intent-warning/40 bg-intent-warning/5'
        : 'border-border-muted bg-surface-primary'
    }`}>
      {/* Card header — always visible */}
      <button
        type="button"
        className="w-full text-left px-4 py-3"
        onClick={onToggle}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {comm.direction === 'INBOUND'
              ? <ArrowDownLeft className="h-3.5 w-3.5 text-intent-info" />
              : <ArrowUpRight className="h-3.5 w-3.5 text-content-muted" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[comm.status]}`}>
                {comm.status === 'AWAITING_REPLY' && <span className="mr-1 h-1.5 w-1.5 rounded-full bg-intent-warning inline-block" />}
                {STATUS_LABELS[comm.status]}
              </span>
              <span className="text-xs text-content-muted">{formatDate(comm.occurredAt)}</span>
            </div>
            <p className="mt-1 text-sm font-medium text-content-primary truncate">{comm.subject}</p>
            {comm.contactName && (
              <p className="text-xs text-content-muted mt-0.5">
                {comm.contactName}{comm.contactEmail ? ` · ${comm.contactEmail}` : ''}
              </p>
            )}
            {comm.notes && !expanded && (
              <p className="mt-1.5 text-xs text-content-secondary line-clamp-2">{comm.notes}</p>
            )}
          </div>
          <div className="shrink-0 ml-1 text-content-muted">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-border-muted px-4 py-3 space-y-3">
          {comm.notes && (
            <p className="text-sm text-content-secondary whitespace-pre-wrap">{comm.notes}</p>
          )}
          {comm.createdBy && (
            <p className="text-xs text-content-muted">Logged by {comm.createdBy.name ?? 'Unknown'}</p>
          )}

          {/* Action row */}
          <div className="flex flex-wrap gap-2 pt-1">
            {comm.status === 'AWAITING_REPLY' && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-intent-success border-intent-success/40 hover:bg-intent-success/10"
                onClick={onMarkReplied}
                disabled={isUpdating}
              >
                <MailCheck className="h-3.5 w-3.5" />Mark Replied
              </Button>
            )}
            {(comm.status === 'AWAITING_REPLY' || comm.status === 'REPLIED') && (
              <Button
                size="sm"
                variant="outline"
                onClick={onMarkResolved}
                disabled={isUpdating}
              >
                <Check className="h-3.5 w-3.5 mr-1" />Resolve
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onEdit} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />Edit
            </Button>
            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="gap-1.5 text-intent-error hover:bg-intent-error/10"
              >
                <Trash2 className="h-3.5 w-3.5" />Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
