/**
 * Registration Successful Email Template
 * Sent to newly registered users (Tourists, Officers, Admins) upon account creation.
 */

import { renderBaseTemplate } from './base.template';

export interface RegistrationSuccessEmailData {
  fullName: string;
  email: string;
  role: 'tourist' | 'officer' | 'admin' | string;
  userCode?: string;
  departmentName?: string;
  designation?: string;
  registeredAt?: string;
}

export function renderRegistrationSuccessEmail(data: RegistrationSuccessEmailData): { subject: string; html: string } {
  const {
    fullName,
    email,
    role,
    userCode,
    departmentName,
    designation,
    registeredAt = new Date().toISOString()
  } = data;

  const roleLabel = role === 'officer' ? 'Grievance Redressal Officer' :
    role === 'admin' ? 'Portal Administrator' : 'Tourist / Citizen';

  const roleBadgeClass = role === 'officer' ? 'badge-primary' :
    role === 'admin' ? 'badge-warning' : 'badge-success';

  const formattedDate = new Date(registeredAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });

  const subject = `Welcome to Tourism-GMS - Account Created`;

  const contentHtml = `
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">
      Welcome to the Tourism-GMS Portal
    </h2>
    <p style="margin-bottom: 16px;">
      Dear <strong>${escapeHtml(fullName)}</strong>,
    </p>
    <p style="margin-bottom: 20px; line-height: 1.6;">
      Your account has been created successfully. You can now log in to the Tourism Grievance Redressal Portal using your registered email address.
    </p>

    <table class="data-table" role="presentation">
      <tr>
        <td class="label">Full Name</td>
        <td class="value">${escapeHtml(fullName)}</td>
      </tr>
      <tr>
        <td class="label">Registered Email</td>
        <td class="value" style="font-family: monospace;">${escapeHtml(email)}</td>
      </tr>
      <tr>
        <td class="label">Account Role</td>
        <td class="value">
          <span class="badge ${roleBadgeClass}">${escapeHtml(roleLabel)}</span>
        </td>
      </tr>
      ${userCode ? `<tr>
        <td class="label">User ID</td>
        <td class="value" style="font-family: monospace; font-weight: 700; color: #0D9488;">${escapeHtml(userCode)}</td>
      </tr>` : ''}
      ${departmentName && departmentName !== 'Unassigned' ? `<tr>
        <td class="label">Department</td>
        <td class="value">${escapeHtml(departmentName)}</td>
      </tr>` : ''}
      ${designation ? `<tr>
        <td class="label">Designation</td>
        <td class="value">${escapeHtml(designation)}</td>
      </tr>` : ''}
      <tr>
        <td class="label">Registration Date</td>
        <td class="value">${escapeHtml(formattedDate)}</td>
      </tr>
    </table>

    <div class="notice-box">
      <strong>Getting started:</strong>
      <p style="margin: 6px 0 0 0; line-height: 1.6;">
        Log in to the portal with your email and password to access your dashboard:
      </p>
      <ul style="margin: 8px 0 0 0; padding-left: 20px; line-height: 1.6;">
        ${role === 'tourist' ? `
          <li>Submit and track grievances regarding tourism services.</li>
          <li>View responses and progress updates from designated officers.</li>
          <li>Share feedback once your grievance is resolved.</li>
        ` : role === 'officer' ? `
          <li>View and manage grievances assigned to your department.</li>
          <li>Post status updates and communicate redressal actions taken.</li>
        ` : `
          <li>Manage departmental workflows, officer accounts, and portal activity.</li>
        `}
      </ul>
    </div>

    <div class="notice-box warning">
      <strong>Security note:</strong> Keep your login credentials private. Our team will never ask for your password. If you ever need to reset your password, you can do so directly from the portal login page.
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
    preheader: `Account created: ${fullName} (${roleLabel})`,
    headerTitle: 'Department of Tourism & Civil Aviation',
    headerSubtitle: 'Welcome to Tourism-GMS',
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
