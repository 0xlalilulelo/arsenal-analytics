'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, PenLine, Type } from 'lucide-react';

type Mode = 'draw' | 'type';

interface SignatureCaptureProps {
  /** Called when the user finalises a signature. Receives a PNG data URL. */
  onCapture: (dataUrl: string) => void;
  /** Called when the user clears / cancels */
  onClear?: () => void;
}

const CANVAS_WIDTH  = 400;
const CANVAS_HEIGHT = 120;

function textToDataUrl(name: string): string {
  const canvas = document.createElement('canvas');
  canvas.width  = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = '#1a1a1a';
  ctx.font = `italic 44px Georgia, serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 16, CANVAS_HEIGHT / 2);
  return canvas.toDataURL('image/png');
}

export function SignatureCapture({ onCapture, onClear }: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>('draw');
  const [typedName, setTypedName] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  function getCtx() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }

  function clearCanvas() {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    setIsEmpty(true);
    lastPos.current = null;
    onClear?.();
  }

  // Init white background
  useEffect(() => {
    clearCanvas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH  / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'draw') return;
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    lastPos.current = pos;
    setIsDrawing(true);
    setIsEmpty(false);
  }, [mode]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || mode !== 'draw') return;
    e.preventDefault();
    const pos = getPos(e);
    if (!pos || !lastPos.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.strokeStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }, [isDrawing, mode]);

  const endDraw = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  function handleCapture() {
    if (mode === 'type') {
      if (!typedName.trim()) return;
      const dataUrl = textToDataUrl(typedName.trim());
      onCapture(dataUrl);
    } else {
      const canvas = canvasRef.current;
      if (!canvas || isEmpty) return;
      onCapture(canvas.toDataURL('image/png'));
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    clearCanvas();
    setTypedName('');
  }

  const canConfirm = mode === 'type' ? typedName.trim().length > 0 : !isEmpty;

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'draw' ? 'default' : 'outline'}
          className="h-7 text-xs gap-1"
          onClick={() => switchMode('draw')}
        >
          <PenLine className="h-3.5 w-3.5" />Draw
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'type' ? 'default' : 'outline'}
          className="h-7 text-xs gap-1"
          onClick={() => switchMode('type')}
        >
          <Type className="h-3.5 w-3.5" />Type name
        </Button>
      </div>

      {mode === 'draw' ? (
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full rounded-md border border-border-muted cursor-crosshair touch-none"
            style={{ height: 90 }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          <p className="text-[10px] text-content-muted mt-1">Draw your signature above</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-1 right-1 h-6 w-6 p-0 text-content-muted hover:text-intent-danger"
            onClick={clearCanvas}
            title="Clear"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label className="text-xs">Full name</Label>
          <Input
            value={typedName}
            onChange={e => setTypedName(e.target.value)}
            placeholder="e.g. Jane Smith"
            className="h-8 text-sm"
          />
          {typedName.trim() && (
            <div
              className="rounded border border-border-muted px-3 py-2 bg-white"
              style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 28 }}
            >
              {typedName}
            </div>
          )}
        </div>
      )}

      <Button
        type="button"
        size="sm"
        className="h-8 text-xs w-full"
        disabled={!canConfirm}
        onClick={handleCapture}
      >
        Apply Signature
      </Button>
    </div>
  );
}
