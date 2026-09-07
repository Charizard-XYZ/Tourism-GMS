/**
 * Password Reset Email Template
 * Sent to users requesting a secure password reset link.
 * Integrates with Firebase Authentication secure action links.
 */

import { renderBaseTemplate } from './base.template';

export interface PasswordResetEmailData {
  recipientName?: string;
  resetLink: string;
  requestedAt?: string;
}

export function renderPasswordResetEmail(data: PasswordResetEmailData): { subject: string; html: string } {
  const {
    recipientName,
    resetLink,
    requestedAt = new Date().toISOString()
  } = data;

  const formattedDate = new Date(requestedAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });

  const greeting = recipientName && recipientName.trim() && recipientName !== 'Valued User'
    ? `Hello <strong>${escapeHtml(recipientName)}</strong>,`
    : 'Hello,';

  const subject = `Reset your Tourism-GMS password`;

  const contentHtml = `
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">
      Password Reset Request
    </h2>
    <p style="margin-bottom: 16px;">
      ${greeting}
    </p>
    <p style="margin-bottom: 20px; line-height: 1.6;">
      We received a request to reset the password for your Tourism-GMS account on <strong>${escapeHtml(formattedDate)}</strong>. You can reset your password using the button below:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" class="btn-action" target="_blank" rel="noopener noreferrer">
        Reset Password
      </a>
    </div>

    <div class="notice-box">
      <p style="margin: 0 0 8px 0; font-weight: 700;">Please note:</p>
      <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
        <li>This reset link is valid for a limited time and can only be used once.</li>
        <li>For your safety, never share this link or your account details with anyone.</li>
        <li>Our team will never ask you for your password.</li>
        <li>If you did not request this change, you can safely ignore this email—your account will remain secure and your password will stay the same.</li>
      </ul>
    </div>

    <p style="margin-top: 24px; font-size: 12px; color: #64748B; word-break: break-all;">
      If the button above does not work, you can copy and paste this link into your browser:<br>
      <a href="${resetLink}" style="color: #0D9488; text-decoration: underline;">${resetLink}</a>
    </p>

    <p style="margin-top: 24px; margin-bottom: 4px;">
      Regards,
    </p>
    <p style="margin-top: 0; font-weight: 700; color: #0F172A;">
      Tourism-GMS Support Team<br>
      <span style="font-weight: 400; color: #64748B;">Department of Tourism &amp; Civil Aviation, Government of Sikkim</span>
    </p>
  `;

  const html = renderBaseTemplate({
    preheader: 'Tourism-GMS Password Reset Request',
    headerTitle: 'Department of Tourism & Civil Aviation',
    headerSubtitle: 'Password Reset',
    contentHtml
  });

  return { subject, html };
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
