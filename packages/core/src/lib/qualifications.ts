/**
 * Training & Qualifications — pure helpers for cert-based task gating.
 *
 * Used by the line-item assign endpoint and the cert-expiry cron.
 */

export interface CertSummary {
  id: string;
  certificationId: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  expiresAt?: Date | string | null;
}

export interface TaskRequirement {
  certificationId: string;
  code: string;
  name: string;
}

export interface AssignVerdict {
  ok: boolean;
  missing: TaskRequirement[];
}

export type CertExpiryUrgency =
  | { urgency: 'none' }
  | { urgency: 'warn'; daysUntilExpiry: number }
  | { urgency: 'expired' };

/**
 * Determine whether a technician can be assigned to a task given the
 * certification requirements for that task and the technician's active certs.
 *
 * Returns { ok: true } when all requirements are met, or { ok: false, missing }
 * listing which certifications are absent/expired/revoked.
 */
export function canTechnicianWorkTask(
  techCerts: CertSummary[],
  requirements: TaskRequirement[],
): AssignVerdict {
  const activeCertIds = new Set(
    techCerts
      .filter(c => c.status === 'ACTIVE')
      .map(c => c.certificationId),
  );

  const missing = requirements.filter(r => !activeCertIds.has(r.certificationId));
  return missing.length === 0 ? { ok: true, missing: [] } : { ok: false, missing };
}

/**
 * Compute urgency category for an upcoming cert expiry.
 * Warn thresholds: 30 days → warn; ≤ 0 days → expired.
 */
export function certExpiryUrgency(
  expiresAt: Date | string | null | undefined,
  options: { warnDays?: number; asOf?: Date } = {},
): CertExpiryUrgency {
  const { warnDays = 30, asOf = new Date() } = options;
  if (!expiresAt) return { urgency: 'none' };
  const expMs = new Date(expiresAt).getTime();
  const nowMs = asOf.getTime();
  if (expMs <= nowMs) return { urgency: 'expired' };
  const daysLeft = Math.floor((expMs - nowMs) / (1000 * 60 * 60 * 24));
  if (daysLeft <= warnDays) return { urgency: 'warn', daysUntilExpiry: daysLeft };
  return { urgency: 'none' };
}
