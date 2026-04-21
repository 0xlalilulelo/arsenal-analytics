/**
 * Tool Crib — pure helpers for calibration scheduling and checkout eligibility.
 *
 * Called from `/api/tools/*` routes and the daily calibration-due cron.
 */

export type ToolStatus =
  | 'AVAILABLE'
  | 'CHECKED_OUT'
  | 'CALIBRATION_DUE'
  | 'OUT_OF_SERVICE'
  | 'LOST';

export interface ToolForCheckout {
  id: string;
  status: ToolStatus;
  calibrationRequired: boolean;
  nextCalibrationDue?: Date | string | null;
}

export type CalibrationStatus =
  | { status: 'na' }
  | { status: 'ok'; daysUntilDue: number }
  | { status: 'warn'; daysUntilDue: number }
  | { status: 'overdue'; daysOverdue: number };

/**
 * Compute the next calibration due date from a completion date and interval.
 * Returns null if interval is falsy (calibration not tracked).
 */
export function calculateNextCalibrationDue(
  performedAt: Date,
  intervalMonths: number | null | undefined,
): Date | null {
  if (!intervalMonths || intervalMonths <= 0) return null;
  const next = new Date(performedAt);
  next.setMonth(next.getMonth() + intervalMonths);
  return next;
}

/**
 * Categorize a tool's calibration state relative to `asOf` (defaults to now).
 * Warn window defaults to 14 days before `nextCalibrationDue`.
 */
export function calibrationStatus(
  tool: Pick<ToolForCheckout, 'calibrationRequired' | 'nextCalibrationDue'>,
  options: { warnDays?: number; asOf?: Date } = {},
): CalibrationStatus {
  const { warnDays = 14, asOf = new Date() } = options;
  if (!tool.calibrationRequired || !tool.nextCalibrationDue) {
    return { status: 'na' };
  }
  const dueMs = new Date(tool.nextCalibrationDue).getTime();
  const nowMs = asOf.getTime();
  const diffDays = Math.floor((dueMs - nowMs) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { status: 'overdue', daysOverdue: Math.abs(diffDays) };
  if (diffDays <= warnDays) return { status: 'warn', daysUntilDue: diffDays };
  return { status: 'ok', daysUntilDue: diffDays };
}

export interface CheckoutVerdict {
  ok: boolean;
  reason?: 'ALREADY_CHECKED_OUT' | 'OUT_OF_SERVICE' | 'LOST' | 'CALIBRATION_OVERDUE';
}

/**
 * Check whether a tool is eligible to be checked out.
 * Blocks CHECKED_OUT, OUT_OF_SERVICE, LOST, and tools with overdue calibration.
 */
export function canCheckoutTool(
  tool: ToolForCheckout,
  options: { asOf?: Date } = {},
): CheckoutVerdict {
  if (tool.status === 'CHECKED_OUT') return { ok: false, reason: 'ALREADY_CHECKED_OUT' };
  if (tool.status === 'OUT_OF_SERVICE') return { ok: false, reason: 'OUT_OF_SERVICE' };
  if (tool.status === 'LOST') return { ok: false, reason: 'LOST' };
  if (calibrationStatus(tool, { asOf: options.asOf }).status === 'overdue') {
    return { ok: false, reason: 'CALIBRATION_OVERDUE' };
  }
  return { ok: true };
}

/**
 * After return, decide the tool's next status. If calibration just went
 * overdue while the tool was out, flag CALIBRATION_DUE; otherwise AVAILABLE.
 */
export function statusAfterReturn(
  tool: Pick<ToolForCheckout, 'calibrationRequired' | 'nextCalibrationDue'>,
  options: { asOf?: Date } = {},
): ToolStatus {
  const cs = calibrationStatus(tool, { asOf: options.asOf });
  if (cs.status === 'overdue') return 'CALIBRATION_DUE';
  return 'AVAILABLE';
}
