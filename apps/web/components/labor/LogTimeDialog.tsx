'use client';
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTechnicians } from '@/hooks/useAnalytics';
import { useCreateLaborEntry } from '@/hooks/useWorkOrderDetail';
import { Timer, StopCircle } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  workOrderId: string;
};

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function LogTimeDialog({ open, onClose, workOrderId }: Props) {
  const { data: techData } = useTechnicians();
  const techs = techData?.data ?? [];
  const { mutateAsync: logTime, isPending } = useCreateLaborEntry(workOrderId);

  const [mode, setMode] = useState<'manual' | 'timer'>('manual');
  const [technicianId, setTechnicianId] = useState('');
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  // Timer mode state
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  function handleStart() {
    setElapsed(0);
    setRunning(true);
  }

  function handleStop() {
    setRunning(false);
    const billedHours = Math.round((elapsed / 3600) * 4) / 4; // quarter-hour round
    setHours(String(billedHours));
    setMode('manual');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!technicianId) { setError('Select a technician'); return; }
    const h = parseFloat(hours);
    if (!h || h <= 0) { setError('Enter hours greater than 0'); return; }

    try {
      await logTime({ technicianId, hours: h, date, description: description || null, billable: true });
      setHours(''); setDescription(''); setTechnicianId(''); setElapsed(0);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handleClose() {
    if (running) handleStop();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Labor Time</DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex border border-surface-hover rounded-md overflow-hidden">
          {(['manual', 'timer'] as const).map(m => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`flex-1 py-1.5 text-xs capitalize transition-colors ${mode === m ? 'bg-intent-primary text-white' : 'text-content-muted hover:text-content-primary'}`}>
              {m === 'timer' ? '⏱ Timer' : '✎ Manual'}
            </button>
          ))}
        </div>

        {mode === 'timer' && !running && elapsed === 0 ? (
          <div className="py-6 flex flex-col items-center gap-4">
            <p className="text-content-muted text-sm">Start the timer when work begins</p>
            <Button onClick={handleStart} className="gap-2 px-8">
              <Timer className="h-4 w-4" />Start Timer
            </Button>
          </div>
        ) : mode === 'timer' && running ? (
          <div className="py-6 flex flex-col items-center gap-4">
            <p className="font-mono text-3xl font-bold text-content-primary tabular-nums">
              {formatElapsed(elapsed)}
            </p>
            <p className="text-xs text-content-muted animate-pulse">Timer running…</p>
            <Button variant="destructive" onClick={handleStop} className="gap-2 px-8">
              <StopCircle className="h-4 w-4" />Stop & Record
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Technician *</Label>
              <Select value={technicianId} onValueChange={setTechnicianId}>
                <SelectTrigger className="mt-1.5 h-8 text-sm">
                  <SelectValue placeholder="Select technician…" />
                </SelectTrigger>
                <SelectContent>
                  {techs.map((t: { id: string; name: string; certifications: string[] }) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.certifications.length > 0 ? `(${t.certifications.join(', ')})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Hours *</Label>
                <Input type="number" step="0.25" min="0.25" value={hours}
                  onChange={e => setHours(e.target.value)}
                  className="mt-1.5 h-8 font-mono text-sm" placeholder="1.50" />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="mt-1.5 h-8 text-sm" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Description (optional)</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)}
                className="mt-1.5 h-8 text-sm" placeholder="Describe work performed…" />
            </div>

            {error && <p className="text-xs text-intent-danger">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs" disabled={isPending}>
                {isPending ? 'Saving…' : 'Log Time'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
