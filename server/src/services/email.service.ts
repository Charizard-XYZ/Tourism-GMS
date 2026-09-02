import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const smtpHost = process.env['SMTP_HOST'] || 'smtp.gmail.com';
const smtpPort = parseInt(process.env['SMTP_PORT'] || '587', 10);
const smtpSecure = process.env['SMTP_SECURE'] === 'true';
const smtpUser = process.env['SMTP_USER'] || '';
const smtpPass = process.env['SMTP_PASSWORD'] || '';
const smtpFrom = process.env['SMTP_FROM'] || '"Tourism-GMS Redressal Portal" <noreply@tourism-gms.gov.in>';

// Create Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  tls: { rejectUnauthorized: false }
});

export class EmailService {
  /**
   * Safe email sender helper to prevent breaking API requests if SMTP fails
   */
  private static async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    if (!to || !to.includes('@')) return false;

    // Skip if SMTP is not configured in environment
    if (!smtpUser && !process.env['ENABLE_SMTP_TESTING']) {
      console.log(`[SMTP SIMULATION] To: ${to} | Subject: ${subject}`);
      return true;
    }

    try {
      const info = await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        html
      });
      console.log(`[SMTP SUCCESS] Email sent to ${to}: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error(`[SMTP ERROR] Failed to send email to ${to}:`, error.message || error);
      return false;
    }
  }

  static async sendGrievanceSubmittedEmail(to: string, touristName: string, trackingCode: string, title: string, category: string): Promise<boolean> {
    const subject = `[Tourism-GMS] Grievance Registered Successfully - ${trackingCode}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0F172A;">Tourism Grievance Redressal Portal</h2>
        <p>Dear <strong>${touristName}</strong>,</p>
        <p>Your grievance has been registered successfully with the Department of Tourism & Civil Aviation, Government of Sikkim.</p>
        <div style="background: #F8FAFC; border-left: 4px solid #A0C8C3; padding: 15px; margin: 15px 0;">
          <p style="margin: 0;"><strong>Tracking Code:</strong> <span style="font-family: monospace; font-size: 16px;">${trackingCode}</span></p>
          <p style="margin: 5px 0 0 0;"><strong>Title:</strong> ${title}</p>
          <p style="margin: 5px 0 0 0;"><strong>Category:</strong> ${category}</p>
        </div>
        <p>You can track the live status of your grievance on your Tourist Dashboard at any time.</p>
        <p>Regards,<br><strong>Directorate of Tourism GMS</strong></p>
      </div>
    `;
    return this.sendMail(to, subject, html);
  }

  static async sendOfficerAssignmentEmail(to: string, officerName: string, trackingCode: string, title: string, category: string): Promise<boolean> {
    const subject = `[Tourism-GMS Action Required] New Grievance Assigned - ${trackingCode}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0F172A;">Officer Desk Assignment Directive</h2>
        <p>Dear Officer <strong>${officerName}</strong>,</p>
        <p>A new grievance ticket has been assigned to your desk for inquiry and redressal.</p>
        <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 15px; margin: 15px 0;">
          <p style="margin: 0;"><strong>Tracking Code:</strong> <span style="font-family: monospace;">${trackingCode}</span></p>
          <p style="margin: 5px 0 0 0;"><strong>Subject:</strong> ${title}</p>
          <p style="margin: 5px 0 0 0;"><strong>Department:</strong> ${category}</p>
        </div>
        <p>Please log in to your Officer Queue to inspect details and initiate inquiry.</p>
        <p>Regards,<br><strong>Tourism GMS Directorate</strong></p>
      </div>
    `;
    return this.sendMail(to, subject, html);
  }

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
    return this.sendMail(to, subject, html);
  }

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
    return this.sendMail(to, subject, html);
  }
}
