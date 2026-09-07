/**
 * Grievance Filed Email Template
 * Sent to the Tourist upon successful registration of a grievance ticket.
 */

import { renderBaseTemplate } from './base.template';

export interface GrievanceFiledEmailData {
  touristName: string;
  grievanceCode: string;
  title: string;
  category: string;
  submittedAt?: string;
  status?: string;
  location?: string;
}

export function renderGrievanceFiledEmail(data: GrievanceFiledEmailData): { subject: string; html: string } {
  const {
    touristName,
    grievanceCode,
    title,
    category,
    submittedAt = new Date().toISOString(),
    status = 'Submitted',
    location
  } = data;

  const formattedDate = new Date(submittedAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });

  const subject = `Grievance Received - ${grievanceCode}`;

  const contentHtml = `
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">
      We have received your grievance
    </h2>
    <p style="margin-bottom: 16px;">
      Dear <strong>${escapeHtml(touristName)}</strong>,
    </p>
    <p style="margin-bottom: 20px; line-height: 1.6;">
      Thank you for contacting the Department of Tourism &amp; Civil Aviation, Government of Sikkim. We have received your grievance and registered it under reference number <strong>${escapeHtml(grievanceCode)}</strong>. Our team is looking into it.
    </p>

    <div style="background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748B; letter-spacing: 0.5px;">
        Grievance Reference Number
      </p>
      <p style="margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 20px; font-weight: 700; color: #0D9488;">
        ${escapeHtml(grievanceCode)}
      </p>
    </div>

    <table class="data-table" role="presentation">
      <tr>
        <td class="label">Reference ID</td>
        <td class="value" style="font-family: monospace; font-weight: 700;">${escapeHtml(grievanceCode)}</td>
      </tr>
      <tr>
        <td class="label">Subject</td>
        <td class="value">${escapeHtml(title)}</td>
      </tr>
      <tr>
        <td class="label">Department</td>
        <td class="value">${escapeHtml(category)}</td>
      </tr>
      <tr>
        <td class="label">Date &amp; Time</td>
        <td class="value">${escapeHtml(formattedDate)}</td>
      </tr>
      ${location ? `<tr>
        <td class="label">Location</td>
        <td class="value">${escapeHtml(location)}</td>
      </tr>` : ''}
      <tr>
        <td class="label">Current Status</td>
        <td class="value">
          <span class="badge badge-primary">${escapeHtml(status.toUpperCase())}</span>
        </td>
      </tr>
    </table>

    <div class="notice-box">
      <strong>Tracking your grievance:</strong> You can check progress, view officer updates, or add extra details anytime by logging in to your Tourist Dashboard on the Tourism-GMS portal.
    </div>

    <p style="margin-top: 24px; margin-bottom: 4px;">
      Warm regards,
    </p>
    <p style="margin-top: 0; font-weight: 700; color: #0F172A;">
      Grievance Redressal Team<br>
      <span style="font-weight: 400; color: #64748B;">Department of Tourism &amp; Civil Aviation, Government of Sikkim</span>
    </p>
  `;

  const html = renderBaseTemplate({
    preheader: `Grievance received: ${grievanceCode} - ${title}`,
    headerTitle: 'Department of Tourism & Civil Aviation',
    headerSubtitle: 'Grievance Redressal Acknowledgement',
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
