/**
 * Officer Assigned Email Template
 * Sent to the assigned Officer when a grievance is assigned to their desk.
 */

import { renderBaseTemplate } from './base.template';

export interface OfficerAssignedEmailData {
  officerName: string;
  grievanceCode: string;
  title: string;
  category: string;
  assignedAt?: string;
  instructions?: string;
}

export function renderOfficerAssignedEmail(data: OfficerAssignedEmailData): { subject: string; html: string } {
  const {
    officerName,
    grievanceCode,
    title,
    category,
    assignedAt = new Date().toISOString(),
    instructions
  } = data;

  const formattedDate = new Date(assignedAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });

  const subject = `New Grievance Assigned - ${grievanceCode}`;

  const contentHtml = `
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">
      Grievance Assigned to Your Desk
    </h2>
    <p style="margin-bottom: 16px;">
      Dear <strong>${escapeHtml(officerName)}</strong>,
    </p>
    <p style="margin-bottom: 20px; line-height: 1.6;">
      A new tourist grievance has been assigned to you for review and resolution. Please look into the case details and take appropriate action.
    </p>

    <div style="background-color: #F8FAFC; border: 1px solid #CBD5E1; border-left: 4px solid #0D9488; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #475569; letter-spacing: 0.5px;">
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
        <td class="label">Assigned On</td>
        <td class="value">${escapeHtml(formattedDate)}</td>
      </tr>
    </table>

    <div class="notice-box">
      <strong>Next steps:</strong>
      <ol style="margin: 8px 0 0 0; padding-left: 20px; line-height: 1.6;">
        <li>Log in to the Tourism-GMS portal and open your <strong>Officer Dashboard</strong>.</li>
        <li>Review the grievance details and any submitted documents.</li>
        <li>Update the status and add remarks as you progress with the resolution.</li>
      </ol>
      ${instructions ? `<p style="margin: 10px 0 0 0; font-size: 12px; color: #475569;"><strong>Notes:</strong> ${escapeHtml(instructions)}</p>` : ''}
    </div>

    <p style="margin-top: 24px; margin-bottom: 4px;">
      Warm regards,
    </p>
    <p style="margin-top: 0; font-weight: 700; color: #0F172A;">
      Department of Tourism &amp; Civil Aviation<br>
      <span style="font-weight: 400; color: #64748B;">Government of Sikkim</span>
    </p>
  `;

  const html = renderBaseTemplate({
    preheader: `Grievance assignment: ${grievanceCode} - ${title}`,
    headerTitle: 'Department of Tourism & Civil Aviation',
    headerSubtitle: 'Grievance Assignment Notification',
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
