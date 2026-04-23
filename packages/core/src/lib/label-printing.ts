// ZPL label builder for Zebra / Brother-compatible thermal printers.
// Targets 4"×2" labels (standard stock) at 203dpi = 812×406 dots.
// Generated ZPL can be sent directly to a network printer, downloaded as
// a .zpl file, or fed to Zebra Browser Print / Brother Print Service.

export interface PartLabelData {
  partNumber: string;
  description: string;
  condition: string; // NEW | OH | SV | AR
  qty: number;
  serialNumber?: string | null;
  lotNumber?: string | null;
  batchNumber?: string | null;
  workOrderNumber?: string | null;
  taggedBy?: string | null;
  taggedAt: string; // ISO date string
  stationName: string;
  documentNumber?: string | null;
}

export interface ToolLabelData {
  assetTag: string;
  name: string;
  manufacturer?: string | null;
  calibrationDue?: string | null; // ISO date string
  bin?: string | null;
  stationName: string;
}

function zplDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return iso; }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// ─── Part / lot label (4"×2") ─────────────────────────────────────────────────

export function buildZplPartLabel(d: PartLabelData): string {
  const cond = d.condition.padEnd(3).slice(0, 3).toUpperCase();
  const traceLines: string[] = [];
  if (d.serialNumber) traceLines.push(`S/N: ${d.serialNumber}`);
  if (d.lotNumber)    traceLines.push(`LOT: ${d.lotNumber}`);
  if (d.batchNumber)  traceLines.push(`BATCH: ${d.batchNumber}`);
  const traceLine = traceLines.join('  ') || 'No trace data';

  // Code 128 barcode for the part number (width 2, height 50, human-readable below)
  // ^FO x,y  ^BY2  ^BCN,50,Y,N,N  ^FD data ^FS
  return [
    '^XA',
    '^CI28',             // UTF-8 encoding
    '^LH0,0',           // label home
    // Condition badge (bold, large)
    `^FO10,8^A0N,28,28^FD${cond}^FS`,
    // Condition description
    `^FO60,14^A0N,18,16^FD${truncate(d.condition, 30)}^FS`,
    // Horizontal rule
    '^FO10,45^GB792,2,2^FS',
    // Part number (monospace bold)
    `^FO10,52^A0N,22,22^FD${truncate(d.partNumber, 28)}^FS`,
    // Description
    `^FO10,82^A0N,16,14^FD${truncate(d.description, 44)}^FS`,
    // Qty
    `^FO650,52^A0N,22,22^FDQTY: ${d.qty}^FS`,
    // Trace info
    `^FO10,106^A0N,14,12^FD${truncate(traceLine, 52)}^FS`,
    // Barcode (part number)
    '^FO10,128^BY1,3,40^BCN,40,Y,N,N',
    `^FD${d.partNumber}^FS`,
    // Footer: station + tagged by + date
    `^FO10,245^A0N,12,10^FD${truncate(d.stationName, 32)}^FS`,
    `^FO10,262^A0N,12,10^FDTagged by: ${d.taggedBy ?? 'Unknown'}  ${zplDate(d.taggedAt)}^FS`,
    ...(d.documentNumber ? [`^FO10,278^A0N,12,10^FDDoc: ${d.documentNumber}^FS`] : []),
    ...(d.workOrderNumber ? [`^FO400,278^A0N,12,10^FDWO: ${d.workOrderNumber}^FS`] : []),
    '^XZ',
  ].join('\n');
}

// ─── Tool asset tag label (4"×2") ────────────────────────────────────────────

export function buildZplToolLabel(d: ToolLabelData): string {
  return [
    '^XA',
    '^CI28',
    '^LH0,0',
    // Asset tag (large)
    `^FO10,8^A0N,30,30^FDTOOL: ${truncate(d.assetTag, 20)}^FS`,
    '^FO10,48^GB792,2,2^FS',
    // Name
    `^FO10,56^A0N,20,18^FD${truncate(d.name, 36)}^FS`,
    // Manufacturer
    ...(d.manufacturer ? [`^FO10,82^A0N,16,14^FD${truncate(d.manufacturer, 44)}^FS`] : []),
    // Barcode (asset tag)
    '^FO10,110^BY1,3,50^BCN,50,Y,N,N',
    `^FD${d.assetTag}^FS`,
    // Calibration due
    ...(d.calibrationDue
      ? [`^FO10,230^A0N,16,14^FDCAL DUE: ${zplDate(d.calibrationDue)}^FS`]
      : [`^FO10,230^A0N,16,14^FDNO CALIBRATION REQUIRED^FS`]),
    // Bin + station
    ...(d.bin ? [`^FO450,230^A0N,16,14^FDBIN: ${d.bin}^FS`] : []),
    `^FO10,258^A0N,12,10^FD${truncate(d.stationName, 48)}^FS`,
    '^XZ',
  ].join('\n');
}
