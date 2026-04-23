'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ChevronDown, ChevronUp, Loader2, GripVertical, ClipboardList } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type WOType = 'SCHEDULED' | 'AOG' | 'INSPECTION' | 'UNSCHEDULED';

interface TemplateStep {
  id: string;
  taskNumber: string;
  description: string;
  referenceDoc: string | null;
  estHours: number;
  sortOrder: number;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  workOrderType: WOType | null;
  steps: TemplateStep[];
}

const WO_TYPE_LABELS: Record<WOType, string> = {
  SCHEDULED: 'Scheduled',
  AOG: 'AOG',
  INSPECTION: 'Inspection',
  UNSCHEDULED: 'Unscheduled',
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useTemplates() {
  return useQuery<Template[]>({
    queryKey: ['task-card-templates'],
    queryFn: async () => {
      const res = await fetch('/api/task-card-templates');
      if (!res.ok) throw new Error('Failed to load');
      return (await res.json() as { data: Template[] }).data;
    },
  });
}

// ─── New Template Dialog ──────────────────────────────────────────────────────

function NewTemplateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [workOrderType, setWorkOrderType] = useState('');
  const [error, setError] = useState('');

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/task-card-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          category: category.trim() || undefined,
          workOrderType: workOrderType || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? 'Failed');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-card-templates'] });
      setName(''); setDescription(''); setCategory(''); setWorkOrderType(''); setError('');
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Task Card Template</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="mt-1.5 h-8 text-sm" placeholder="e.g. 100-Hour Inspection" />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Input value={category} onChange={e => setCategory(e.target.value)} className="mt-1.5 h-8 text-sm" placeholder="e.g. Airframe, Engine, Avionics" />
          </div>
          <div>
            <Label className="text-xs">Default Work Order Type</Label>
            <Select value={workOrderType} onValueChange={setWorkOrderType}>
              <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="text-xs">Any</SelectItem>
                {(Object.keys(WO_TYPE_LABELS) as WOType[]).map(t => (
                  <SelectItem key={t} value={t} className="text-xs">{WO_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1.5 text-sm min-h-14" placeholder="Optional notes about when to apply this template…" />
          </div>
          {error && <p className="text-xs text-intent-danger">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => mutateAsync()} disabled={isPending || !name.trim()}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Step Dialog ──────────────────────────────────────────────────────────

function AddStepDialog({ open, onClose, templateId }: { open: boolean; onClose: () => void; templateId: string }) {
  const qc = useQueryClient();
  const [taskNumber, setTaskNumber] = useState('');
  const [description, setDescription] = useState('');
  const [referenceDoc, setReferenceDoc] = useState('');
  const [estHours, setEstHours] = useState('');
  const [error, setError] = useState('');

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/task-card-templates/${templateId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskNumber: taskNumber.trim(),
          description: description.trim(),
          referenceDoc: referenceDoc.trim() || undefined,
          estHours: parseFloat(estHours) || 0,
        }),
      });
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? 'Failed');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-card-templates'] });
      setTaskNumber(''); setDescription(''); setReferenceDoc(''); setEstHours(''); setError('');
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Step</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div className="flex gap-2">
            <div className="w-24">
              <Label className="text-xs">Task No. *</Label>
              <Input value={taskNumber} onChange={e => setTaskNumber(e.target.value)} className="mt-1.5 h-8 text-sm font-mono" placeholder="1.1" />
            </div>
            <div className="flex-1">
              <Label className="text-xs">Est. Hours</Label>
              <Input type="number" value={estHours} onChange={e => setEstHours(e.target.value)} className="mt-1.5 h-8 text-sm" placeholder="0.5" min="0" step="0.25" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Description *</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1.5 text-sm min-h-16" placeholder="Describe the task…" />
          </div>
          <div>
            <Label className="text-xs">Reference Doc (AMM / SB / AD)</Label>
            <Input value={referenceDoc} onChange={e => setReferenceDoc(e.target.value)} className="mt-1.5 h-8 text-sm" placeholder="e.g. AMM 05-10-00" />
          </div>
          {error && <p className="text-xs text-intent-danger">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => mutateAsync()} disabled={isPending || !taskNumber.trim() || !description.trim()}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}Add Step
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({ template }: { template: Template }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { mutateAsync: deleteTemplate } = useMutation({
    mutationFn: async () => {
      await fetch(`/api/task-card-templates/${template.id}`, { method: 'DELETE' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-card-templates'] }),
  });

  const { mutateAsync: deleteStep } = useMutation({
    mutationFn: async (stepId: string) => {
      await fetch(`/api/task-card-templates/${template.id}/steps?stepId=${stepId}`, { method: 'DELETE' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-card-templates'] }),
  });

  const totalEstHours = template.steps.reduce((s, st) => s + st.estHours, 0);

  return (
    <>
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm">{template.name}</CardTitle>
                {template.category && (
                  <Badge variant="open" className="text-[10px]">{template.category}</Badge>
                )}
                {template.workOrderType && (
                  <Badge variant="complete" className="text-[10px]">{WO_TYPE_LABELS[template.workOrderType]}</Badge>
                )}
              </div>
              {template.description && (
                <p className="text-xs text-content-muted mt-0.5">{template.description}</p>
              )}
              <p className="text-xs text-content-muted mt-0.5">
                {template.steps.length} step{template.steps.length !== 1 ? 's' : ''}
                {totalEstHours > 0 ? ` · ${totalEstHours.toFixed(1)}h est.` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setAddStepOpen(true)}>
                <Plus className="h-3 w-3" />Step
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-content-muted hover:text-intent-danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(e => !e)}>
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="pt-0 px-4 pb-4">
            {template.steps.length === 0 ? (
              <p className="text-xs text-content-muted py-2 text-center">No steps yet. Add a step to begin.</p>
            ) : (
              <div className="space-y-1 mt-1">
                {template.steps.map(step => (
                  <div key={step.id} className="flex items-start gap-2 rounded-md border border-surface-hover px-3 py-2 text-xs">
                    <GripVertical className="h-3.5 w-3.5 text-content-muted shrink-0 mt-0.5" />
                    <span className="font-mono font-semibold text-content-muted w-8 shrink-0">{step.taskNumber}</span>
                    <div className="flex-1 min-w-0">
                      <p>{step.description}</p>
                      {step.referenceDoc && <p className="text-content-muted">{step.referenceDoc}</p>}
                    </div>
                    <span className="text-content-muted shrink-0">{step.estHours > 0 ? `${step.estHours}h` : ''}</span>
                    <Button
                      variant="ghost" size="sm" className="h-5 w-5 p-0 text-content-muted hover:text-intent-danger shrink-0"
                      onClick={() => deleteStep(step.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <AddStepDialog open={addStepOpen} onClose={() => setAddStepOpen(false)} templateId={template.id} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{template.name}</strong> and all its steps will be permanently deleted.
              This does not affect work orders that have already had this template applied.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-intent-danger hover:bg-intent-danger/90 text-white"
              onClick={() => deleteTemplate()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TaskCardsPage() {
  const [newOpen, setNewOpen] = useState(false);
  const { data: templates = [], isLoading } = useTemplates();

  const categories = [...new Set(templates.map(t => t.category).filter(Boolean))] as string[];
  const uncategorized = templates.filter(t => !t.category);

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Task Card Templates"
        subtitle="Reusable inspection checklists applied to work orders"
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setNewOpen(true)}>
            <Plus className="h-3.5 w-3.5" />New Template
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <ClipboardList className="h-10 w-10 text-content-muted" />
            <p className="text-sm text-content-muted">No task card templates yet.</p>
            <p className="text-xs text-content-muted max-w-sm">Create reusable checklists like "100-Hour Inspection" or "Annual Phase 1" and apply them to work orders to auto-populate line items.</p>
            <Button size="sm" className="mt-2 gap-1" onClick={() => setNewOpen(true)}>
              <Plus className="h-3.5 w-3.5" />Create first template
            </Button>
          </div>
        ) : (
          <>
            {categories.map(cat => {
              const catTemplates = templates.filter(t => t.category === cat);
              return (
                <div key={cat} className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-content-muted">{cat}</h3>
                  {catTemplates.map(t => <TemplateCard key={t.id} template={t} />)}
                </div>
              );
            })}
            {uncategorized.length > 0 && (
              <div className="space-y-2">
                {categories.length > 0 && (
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-content-muted">Uncategorized</h3>
                )}
                {uncategorized.map(t => <TemplateCard key={t.id} template={t} />)}
              </div>
            )}
          </>
        )}
      </div>

      <NewTemplateDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}
