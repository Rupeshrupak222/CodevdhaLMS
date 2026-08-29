// ─── Admin Login Audit Logger ────────────────────────────────────────────────
//
// Logs every admin login with IP, device, and timestamp.
// Sends email notification when SMTP is configured.
// Stores audit entries in-memory (and logs to console for production monitoring).
//
// For production: pipe logs to a log management service (CloudWatch, Datadog, etc.)
// ─────────────────────────────────────────────────────────────────────────────

import { env } from '../config/env';

interface AdminAuditEntry {
  userId: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'SESSION_REVOKED';
}

// Keep last 100 admin audit entries in memory (viewable via admin API if needed)
const auditLog: AdminAuditEntry[] = [];
const MAX_AUDIT_ENTRIES = 100;

/**
 * Log an admin authentication event.
 */
export const logAdminEvent = (entry: AdminAuditEntry): void => {
  // Store in memory
  auditLog.push(entry);
  if (auditLog.length > MAX_AUDIT_ENTRIES) {
    auditLog.shift(); // Remove oldest
  }

  // Console log for production log aggregation (structured format)
  const logMessage = `[ADMIN AUDIT] ${entry.action} | User: ${entry.email} | IP: ${entry.ipAddress} | Device: ${entry.userAgent} | Time: ${entry.timestamp.toISOString()}`;

  if (entry.action === 'LOGIN_FAILED') {
    console.warn(logMessage);
  } else {
    console.log(logMessage);
  }

  // Send email notification if SMTP is configured
  if (entry.action === 'LOGIN_SUCCESS' && isSmtpConfigured()) {
    sendAdminLoginNotification(entry).catch((err) => {
      console.error('[ADMIN AUDIT] Failed to send email notification:', err.message);
    });
  }
};

/**
 * Get recent admin audit log entries (for admin dashboard or API).
 */
export const getAdminAuditLog = (): AdminAuditEntry[] => {
  return [...auditLog].reverse(); // Newest first
};

// ── Email Notification ───────────────────────────────────────────────────────

const isSmtpConfigured = (): boolean => {
  return !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
};

const sendAdminLoginNotification = async (entry: AdminAuditEntry): Promise<void> => {
  // Dynamic import to avoid loading nodemailer if SMTP not configured
  const nodemailer = await import('nodemailer');

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  const subject = `🔐 Admin Login Alert — ${entry.email}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1E293B;">Admin Login Detected</h2>
      <p>A successful admin login was recorded on <strong>CodVedha LMS</strong>.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 8px; font-weight: bold; color: #475569;">Account</td>
          <td style="padding: 8px;">${entry.email}</td>
        </tr>
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 8px; font-weight: bold; color: #475569;">IP Address</td>
          <td style="padding: 8px;">${entry.ipAddress}</td>
        </tr>
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 8px; font-weight: bold; color: #475569;">Device</td>
          <td style="padding: 8px;">${entry.userAgent}</td>
        </tr>
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 8px; font-weight: bold; color: #475569;">Time</td>
          <td style="padding: 8px;">${entry.timestamp.toISOString()}</td>
        </tr>
      </table>
      <p style="color: #EF4444; font-weight: bold;">If this was not you, immediately change your password and contact the system administrator.</p>
      <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
      <p style="color: #94A3B8; font-size: 12px;">This is an automated security notification from CodVedha LMS.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"CodVedha Security" <${env.EMAIL_FROM}>`,
    to: entry.email,
    subject,
    html,
  });
};
