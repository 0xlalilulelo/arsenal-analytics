/**
 * Email utility — wraps Resend for transactional emails.
 * Set RESEND_API_KEY and RESEND_FROM_EMAIL in .env to enable real delivery.
 * Falls back to console.log in dev / when env vars are absent.
 */

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@arsenalaviationservices.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

async function sendEmail(payload: EmailPayload): Promise<{ sent: boolean }> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL STUB] To: ${payload.to}`);
    console.log(`[EMAIL STUB] Subject: ${payload.subject}`);
    return { sent: false };
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: FROM_EMAIL, ...payload });
    if (error) { console.error('[EMAIL] Resend error:', error); return { sent: false }; }
    return { sent: true };
  } catch (e) {
    console.error('[EMAIL] Failed to send:', e);
    return { sent: false };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Email Templates
// ──────────────────────────────────────────────────────────────────────────────

function base(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f1117;color:#c8ccd4;margin:0;padding:32px 16px}
.wrap{max-width:560px;margin:0 auto}.logo{font-size:13px;font-weight:700;color:#5b8aff;letter-spacing:.05em;margin-bottom:24px}
.card{background:#1a1d27;border:1px solid #2a2d3a;border-radius:10px;padding:28px 32px;margin-bottom:16px}
h2{margin:0 0 8px;font-size:18px;color:#e8eaf0}p{margin:8px 0;font-size:14px;line-height:1.6;color:#8a8f9c}
.mono{font-family:'Courier New',monospace}.gold{color:#f5a623;font-weight:700}
.btn{display:inline-block;margin-top:20px;padding:12px 28px;background:#5b8aff;color:#fff;font-size:14px;font-weight:600;border-radius:6px;text-decoration:none}
.dim{color:#555;font-size:12px;margin-top:20px}hr{border:none;border-top:1px solid #2a2d3a;margin:20px 0}</style></head>
<body><div class="wrap"><div class="logo">✈ ARSENAL AVIATION SERVICES</div>${content}
<p class="dim">This is an automated message. Do not reply directly to this email.</p></div></body></html>`;
}

// ── Quote sent ────────────────────────────────────────────────────────────────
export async function sendQuoteEmail(opts: {
  to: string;
  customerName: string;
  quoteNumber: string;
  total: number;
  aircraftNNumber?: string;
  approvalUrl: string;
  validDays: number;
}) {
  const { to, customerName, quoteNumber, total, aircraftNNumber, approvalUrl, validDays } = opts;
  const subject = `Service Estimate ${quoteNumber} — Arsenal Aviation Services`;
  const html = base(`
    <div class="card">
      <h2>Your Service Estimate is Ready</h2>
      <p>Hi ${customerName},</p>
      <p>We've prepared a service estimate for your review${aircraftNNumber ? ` for <span class="mono">${aircraftNNumber}</span>` : ''}.</p>
      <hr>
      <p><strong>Quote #:</strong> <span class="mono">${quoteNumber}</span></p>
      <p><strong>Estimate Total:</strong> <span class="gold">$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
      <p><strong>Valid for:</strong> ${validDays} days</p>
      <p style="margin-top:16px">Please review the detailed scope of work and approve or decline using the link below:</p>
      <a href="${approvalUrl}" class="btn">Review &amp; Approve Quote</a>
    </div>
    <p class="dim">If the button doesn't work, copy this link: ${approvalUrl}</p>
  `);
  return sendEmail({ to, subject, html });
}

// ── Invoice sent ──────────────────────────────────────────────────────────────
export async function sendInvoiceEmail(opts: {
  to: string;
  customerName: string;
  invoiceNumber: string;
  total: number;
  balance: number;
  dueDate: string | null;
  portalUrl: string;
}) {
  const { to, customerName, invoiceNumber, total, balance, dueDate, portalUrl } = opts;
  const subject = `Invoice ${invoiceNumber} — Arsenal Aviation Services`;
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const html = base(`
    <div class="card">
      <h2>Invoice ${invoiceNumber}</h2>
      <p>Hi ${customerName},</p>
      <p>Please find your invoice attached below. You can view your invoice and submit payment using the link below.</p>
      <hr>
      <p><strong>Invoice #:</strong> <span class="mono">${invoiceNumber}</span></p>
      <p><strong>Invoice Total:</strong> <span class="gold">$${fmt(total)}</span></p>
      ${balance < total ? `<p><strong>Balance Due:</strong> <span class="gold">$${fmt(balance)}</span></p>` : ''}
      ${dueDate ? `<p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
      <a href="${portalUrl}" class="btn">View Invoice &amp; Pay</a>
    </div>
    <p class="dim">If the button doesn't work, copy this link: ${portalUrl}</p>
  `);
  return sendEmail({ to, subject, html });
}

// ── AOG alert ─────────────────────────────────────────────────────────────────
export async function sendAogAlertEmail(opts: {
  to: string;
  woNumber: string;
  nNumber: string;
  customerName: string;
  woUrl: string;
}) {
  const { to, woNumber, nNumber, customerName, woUrl } = opts;
  const subject = `🚨 AOG Alert — ${nNumber} — ${woNumber}`;
  const html = base(`
    <div class="card" style="border-color:#e53e3e">
      <h2 style="color:#fc8181">⚠ Aircraft on Ground (AOG)</h2>
      <p>An AOG work order has been opened and requires immediate attention.</p>
      <hr>
      <p><strong>Work Order:</strong> <span class="mono">${woNumber}</span></p>
      <p><strong>Aircraft:</strong> <span class="mono">${nNumber}</span></p>
      <p><strong>Customer:</strong> ${customerName}</p>
      <a href="${woUrl}" class="btn" style="background:#e53e3e">View Work Order</a>
    </div>
  `);
  return sendEmail({ to, subject, html });
}

export { APP_URL };
