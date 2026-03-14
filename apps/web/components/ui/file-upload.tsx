'use client';
import * as React from 'react';
import { Paperclip, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  /** URL prefix for storage path, e.g. "squawks/" or "compliance/" */
  prefix?: string;
  accept?: string;
  maxMb?: number;
  /** Called with the public URL after a successful upload */
  onUpload: (url: string, name: string) => void;
  className?: string;
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

export function FileUpload({ prefix = 'uploads/', accept, maxMb = 10, onUpload, className }: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [state, setState] = React.useState<UploadState>('idle');
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setState('uploading');
    setError(null);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('prefix', prefix);

    try {
      const res = await fetch('/api/uploads', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      onUpload(json.url, file.name);
      setState('done');
    } catch (e) {
      setError((e as Error).message);
      setState('error');
    }
  }

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > maxMb * 1024 * 1024) {
            setError(`File exceeds ${maxMb} MB`);
            setState('error');
            return;
          }
          void handleFile(file);
        }}
      />

      {state === 'idle' && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs text-content-secondary hover:text-content-primary transition-colors border border-dashed border-surface-hover rounded-md px-3 py-2 w-full justify-center"
        >
          <Paperclip className="h-3.5 w-3.5" />
          Attach file (max {maxMb} MB)
        </button>
      )}

      {state === 'uploading' && (
        <div className="flex items-center gap-1.5 text-xs text-content-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Uploading {fileName}…
        </div>
      )}

      {state === 'done' && (
        <div className="flex items-center gap-1.5 text-xs text-intent-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {fileName} uploaded
          <button
            type="button"
            className="ml-auto text-content-muted hover:text-content-primary"
            onClick={() => { setState('idle'); setFileName(null); }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {state === 'error' && (
        <div className="flex items-center gap-1.5 text-xs text-intent-danger">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
          <button
            type="button"
            className="ml-auto text-content-muted hover:text-content-primary"
            onClick={() => { setState('idle'); setFileName(null); setError(null); }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Renders a list of file URL thumbnails with remove buttons */
export function FileList({
  urls,
  onRemove,
}: {
  urls: string[];
  onRemove?: (url: string) => void;
}) {
  if (!urls.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {urls.map(url => {
        const isImage = /\.(jpe?g|png|webp|heic)$/i.test(url);
        const name = decodeURIComponent(url.split('/').pop() ?? url).replace(/^\d+-/, '');
        return (
          <div key={url} className="relative group flex items-center gap-1.5 rounded border border-surface-hover bg-surface-card px-2 py-1 text-xs text-content-secondary">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={name} className="h-6 w-6 object-cover rounded" />
            ) : (
              <Paperclip className="h-3.5 w-3.5 shrink-0" />
            )}
            <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-content-primary truncate max-w-[120px]">
              {name}
            </a>
            {onRemove && (
              <button type="button" onClick={() => onRemove(url)} className="text-content-muted hover:text-intent-danger ml-0.5">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
