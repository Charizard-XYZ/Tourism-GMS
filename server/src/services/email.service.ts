import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import {
  GrievanceFiledEmailData,
  renderGrievanceFiledEmail,
  OfficerAssignedEmailData,
  renderOfficerAssignedEmail,
  PasswordResetEmailData,
  renderPasswordResetEmail,
  RegistrationSuccessEmailData,
  renderRegistrationSuccessEmail
} from './email-templates';

dotenv.config();

/**
 * Reads SMTP credentials dynamically from environment variables
 */
function getTransporter() {
  const smtpHost = process.env['SMTP_HOST'] || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env['SMTP_PORT'] || '587', 10);
  const smtpSecure = process.env['SMTP_SECURE'] === 'true';
  const smtpUser = process.env['SMTP_USER'] || '';
  const smtpPass = process.env['SMTP_PASSWORD'] || '';

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    tls: { rejectUnauthorized: false }
  });
}

const defaultFrom = process.env['SMTP_FROM'] || '"Tourism-GMS Redressal Portal" <noreply@tourism-gms.gov.in>';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  eventType: 'GRIEVANCE_FILED' | 'OFFICER_ASSIGNED' | 'PASSWORD_RESET' | 'REGISTRATION_SUCCESS' | 'STATUS_UPDATE' | 'RESOLUTION' | 'GENERAL';
  referenceId?: string;
}

export class EmailService {
  /**
   * Safe email sender helper.
   * Isolates SMTP delivery failures so they NEVER break or roll back core operations.
   * Strictly avoids logging passwords, private tokens, or authentication secrets.
   */
  public static async sendMail(options: SendMailOptions): Promise<boolean> {
    const { to, subject, html, eventType, referenceId = 'N/A' } = options;

    if (!to || !to.includes('@')) {
      console.warn(`[EMAIL NOTICE] [Event: ${eventType}] Invalid recipient email address: "${to}"`);
      return false;
    }

    const smtpUser = process.env['SMTP_USER'] || '';
    const isTestingMode = process.env['NODE_ENV'] === 'test' || !smtpUser;

    // Simulation mode when SMTP credentials are not configured
    if (isTestingMode) {
      console.log(`[EMAIL SIMULATION] [Event: ${eventType}] [Ref: ${referenceId}] Recipient: ${to} | Subject: "${subject}"`);
      return true;
    }

    try {
      const transporter = getTransporter();
      const from = process.env['SMTP_FROM'] || defaultFrom;
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html
      });
      console.log(`[EMAIL SUCCESS] [Event: ${eventType}] [Ref: ${referenceId}] MessageId: ${info.messageId} | Recipient: ${to}`);
      return true;
    } catch (error: any) {
      // Log sanitized failure message without secrets
      const errMsg = error?.message || String(error);
      console.error(`[EMAIL ERROR] [Event: ${eventType}] [Ref: ${referenceId}] Recipient: ${to} | Failure: ${errMsg}`);
      return false;
    }
  }

  /**
   * 1. Grievance Filed Notification
   * Sent to Tourist after successful registration of grievance in Firestore.
   */
  static async sendGrievanceFiledEmail(to: string, data: GrievanceFiledEmailData): Promise<boolean> {
    try {
      const { subject, html } = renderGrievanceFiledEmail(data);
      return await this.sendMail({
        to,
        subject,
        html,
        eventType: 'GRIEVANCE_FILED',
        referenceId: data.grievanceCode
      });
    } catch (err: any) {
      console.error(`[EMAIL TEMPLATE ERROR] Grievance filed template generation failed for ${to}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Backward-compatible alias for grievance submission
   */
  static async sendGrievanceSubmittedEmail(
    to: string,
    touristName: string,
    trackingCode: string,
    title: string,
    category: string,
    submittedAt?: string,
    status?: string
  ): Promise<boolean> {
    return this.sendGrievanceFiledEmail(to, {
      touristName,
      grievanceCode: trackingCode,
      title,
      category,
      submittedAt: submittedAt || new Date().toISOString(),
      status: status || 'Submitted'
    });
  }

  /**
   * 2. Officer Assigned Notification
   * Sent to the designated Officer after atomic assignment of a grievance.
   * Supports both object-based data and positional arguments.
   */
  static async sendOfficerAssignmentEmail(
    to: string,
    officerOrData: string | OfficerAssignedEmailData,
    trackingCode?: string,
    title?: string,
    category?: string,
    assignedAt?: string
  ): Promise<boolean> {
    try {
      let data: OfficerAssignedEmailData;

      if (typeof officerOrData === 'object') {
        data = officerOrData;
      } else {
        data = {
          officerName: officerOrData,
          grievanceCode: trackingCode || 'Grievance',
          title: title || 'Assigned Grievance',
          category: category || 'General',
          assignedAt: assignedAt || new Date().toISOString()
        };
      }

      const { subject, html } = renderOfficerAssignedEmail(data);
      return await this.sendMail({
        to,
        subject,
        html,
        eventType: 'OFFICER_ASSIGNED',
        referenceId: data.grievanceCode
      });
    } catch (err: any) {
      console.error(`[EMAIL TEMPLATE ERROR] Officer assignment template generation failed for ${to}:`, err?.message || err);
      return false;
    }
  }

  /**
   * 3. Password Reset Notification
   * Sent to registered users with Firebase secure password reset action link.
   * Never exposes old or new passwords.
   */
  static async sendPasswordResetEmail(to: string, data: PasswordResetEmailData): Promise<boolean> {
    try {
      const { subject, html } = renderPasswordResetEmail(data);
      return await this.sendMail({
        to,
        subject,
        html,
        eventType: 'PASSWORD_RESET',
        referenceId: 'PASSWORD_RESET'
      });
    } catch (err: any) {
      console.error(`[EMAIL TEMPLATE ERROR] Password reset template generation failed for ${to}:`, err?.message || err);
      return false;
    }
  }

  /**
   * 4. Registration Successful Notification
   * Sent to newly registered users (Tourists, Officers, Admins) after account creation in Firestore.
   */
  static async sendRegistrationSuccessEmail(to: string, data: RegistrationSuccessEmailData): Promise<boolean> {
    try {
      const { subject, html } = renderRegistrationSuccessEmail(data);
      return await this.sendMail({
        to,
        subject,
        html,
        eventType: 'REGISTRATION_SUCCESS',
        referenceId: data.userCode || data.email
      });
    } catch (err: any) {
      console.error(`[EMAIL TEMPLATE ERROR] Registration success template generation failed for ${to}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Status Update Notification (Preserved for backward compatibility)
   */
  static async sendStatusUpdateEmail(to: string, touristName: string, trackingCode: string, newStatus: string): Promise<boolean> {
    const subject = `[Tourism-GMS] Grievance Status Update - ${trackingCode}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0F172A;">Status Update Notification</h2>
        <p>Dear <strong>${touristName}</strong>,</p>
        <p>The status of your grievance ticket <strong>${trackingCode}</strong> has been updated to:</p>
        <p style="font-size: 18px; font-weight: bold; color: #0284C7; text-transform: uppercase;">${newStatus.replace('_', ' ')}</p>
        <p>Log in to your account to view progress details and official notes.</p>
        <p>Regards,<br><strong>Tourism GMS Cell</strong></p>
      </div>
    `;
    return this.sendMail({ to, subject, html, eventType: 'STATUS_UPDATE', referenceId: trackingCode });
  }

  /**
   * Resolution Notification (Preserved for backward compatibility)
   */
  static async sendResolutionEmail(to: string, touristName: string, trackingCode: string, resolutionDetails?: string): Promise<boolean> {
    const subject = `[Tourism-GMS Resolved] Grievance Case Closed/Resolved - ${trackingCode}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #059669;">Grievance Resolution Summary</h2>
        <p>Dear <strong>${touristName}</strong>,</p>
        <p>We are pleased to inform you that your grievance ticket <strong>${trackingCode}</strong> has been officially resolved.</p>
        ${resolutionDetails ? `
        <div style="background: #ECFDF5; border-left: 4px solid #10B981; padding: 15px; margin: 15px 0;">
          <p style="margin: 0;"><strong>Official Resolution Report:</strong></p>
          <p style="margin: 5px 0 0 0; white-space: pre-line;">${resolutionDetails}</p>
        </div>` : ''}
        <p>Please log in to your account to inspect the resolution report, download proof attachments, and rate officer redressal.</p>
        <p>Regards,<br><strong>Directorate of Tourism GMS</strong></p>
      </div>
    `;
    return this.sendMail({ to, subject, html, eventType: 'RESOLUTION', referenceId: trackingCode });
  }
}
