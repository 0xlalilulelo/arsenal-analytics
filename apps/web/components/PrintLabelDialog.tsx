'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Download, CheckCircle2 } from 'lucide-react';
import type { PartLabelData, ToolLabelData } from '@mro/core';

interface Props {
  open: boolean;
  onClose: () => void;
  type: 'PART' | 'TOOL';
  data: PartLabelData | ToolLabelData;
}

export function PrintLabelDialog({ open, onClose, type, data }: Props) {
  const [zpl, setZpl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  async function generateZpl() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data }),
      });
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? 'Failed');
      const { zpl: z } = await res.json() as { zpl: string };
      setZpl(z);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate label');
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    if (!zpl) return;
    await navigator.clipboard.writeText(zpl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadZpl() {
    if (!zpl) return;
    const tag = type === 'PART'
      ? (data as PartLabelData).partNumber.replace(/[^A-Za-z0-9-]/g, '-')
      : (data as ToolLabelData).assetTag.replace(/[^A-Za-z0-9-]/g, '-');
    const blob = new Blob([zpl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `label-${tag}.zpl`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClose() {
    setZpl(null);
    setError('');
    setCopied(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Print Label — {type === 'PART' ? (data as PartLabelData).partNumber : (data as ToolLabelData).assetTag}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {!zpl ? (
            <>
              <p className="text-sm text-content-secondary">
                Generate a ZPL label for a Zebra or Brother QL thermal printer (4"×2" format).
                Send the ZPL to your printer via network, USB, or Zebra Browser Print.
              </p>
              {error && <p className="text-xs text-intent-danger">{error}</p>}
              <Button className="w-full gap-1.5" onClick={generateZpl} disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {loading ? 'Generating…' : 'Generate ZPL Label'}
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-md bg-surface-secondary border border-border-muted p-3">
                <pre className="text-[10px] font-mono text-content-primary overflow-x-auto max-h-48 whitespace-pre">{zpl}</pre>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-content-muted">
                  Copy the ZPL and paste it into Zebra Browser Print, or download the file and send it to your printer's IP address.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={copyToClipboard}>
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-intent-success" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied!' : 'Copy ZPL'}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={downloadZpl}>
                    <Download className="h-3.5 w-3.5" />Download .zpl
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
