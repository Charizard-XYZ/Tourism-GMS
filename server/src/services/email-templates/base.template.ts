/**
 * Base Email Template for Tourism-GMS
 * Provides standardized responsive styling, official branding header,
 * content wrapper, and formal government portal footer.
 * Strictly adheres to professional styling with no emojis.
 */

export interface BaseTemplateOptions {
  preheader?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  contentHtml: string;
}

export function renderBaseTemplate(options: BaseTemplateOptions): string {
  const {
    preheader = 'Tourism Grievance Redressal Portal',
    headerTitle = 'Department of Tourism & Civil Aviation',
    headerSubtitle = 'Tourism Grievance Redressal Portal (Tourism-GMS)',
    contentHtml
  } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Tourism-GMS Notification</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F1F5F9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1E293B;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    table {
      border-collapse: collapse;
    }
    img {
      border: 0;
      outline: none;
      text-decoration: none;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      overflow: hidden;
    }
    .header-bar {
      background-color: #0F172A;
      padding: 24px 32px;
      text-align: left;
      border-bottom: 3px solid #0D9488;
    }
    .header-title {
      color: #F8FAFC;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin: 0 0 4px 0;
      text-transform: uppercase;
    }
    .header-subtitle {
      color: #94A3B8;
      font-size: 13px;
      margin: 0;
      font-weight: 500;
    }
    .content-body {
      padding: 32px;
      background-color: #FFFFFF;
      line-height: 1.6;
      color: #334155;
      font-size: 14px;
    }
    .footer-bar {
      background-color: #F8FAFC;
      padding: 24px 32px;
      border-top: 1px solid #E2E8F0;
      text-align: center;
      font-size: 12px;
      color: #64748B;
      line-height: 1.5;
    }
    .footer-highlight {
      font-weight: 600;
      color: #334155;
    }
    .data-table {
      width: 100%;
      margin: 20px 0;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      overflow: hidden;
    }
    .data-table td {
      padding: 10px 14px;
      font-size: 13px;
      border-bottom: 1px solid #F1F5F9;
    }
    .data-table tr:last-child td {
      border-bottom: none;
    }
    .data-table .label {
      width: 35%;
      font-weight: 600;
      color: #475569;
      background-color: #F8FAFC;
    }
    .data-table .value {
      width: 65%;
      color: #0F172A;
      font-weight: 500;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-radius: 4px;
    }
    .badge-primary {
      background-color: #E0F2FE;
      color: #0369A1;
    }
    .badge-success {
      background-color: #DCFCE7;
      color: #15803D;
    }
    .badge-warning {
      background-color: #FEF3C7;
      color: #B45309;
    }
    .btn-action {
      display: inline-block;
      padding: 12px 28px;
      background-color: #0D9488;
      color: #FFFFFF !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      border-radius: 6px;
      margin: 16px 0;
    }
    .notice-box {
      background-color: #F8FAFC;
      border-left: 4px solid #0D9488;
      padding: 14px 18px;
      margin: 20px 0;
      font-size: 13px;
      color: #334155;
    }
    .notice-box.warning {
      background-color: #FFFBEB;
      border-left-color: #D97706;
      color: #92400E;
    }
  </style>
</head>
<body>
  <div style="display: none; font-size: 1px; color: #F1F5F9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding: 24px 12px; background-color: #F1F5F9;">
    <tr>
      <td align="center">
        <div class="email-container">
          <!-- Header -->
          <div class="header-bar">
            <h1 class="header-title">${headerTitle}</h1>
            <p class="header-subtitle">${headerSubtitle}</p>
          </div>
          <!-- Body -->
          <div class="content-body">
            ${contentHtml}
          </div>
          <!-- Footer -->
          <div class="footer-bar">
            <p style="margin: 0 0 6px 0;" class="footer-highlight">Tourism Grievance Redressal Portal (Tourism-GMS)</p>
            <p style="margin: 0 0 6px 0;">Directorate of Tourism &amp; Civil Aviation &bull; Government of Sikkim</p>
            <p style="margin: 0; font-size: 11px; color: #94A3B8;">
              This is an automated notification. If you need help or have questions, please log in to your portal dashboard.
            </p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
