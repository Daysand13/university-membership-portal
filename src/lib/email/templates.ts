const BRAND_COLOR = "#24266B";

/** Everything the email layout needs to look like it actually belongs to
 * this association, pulled from Site Settings rather than hardcoded, so
 * updating the org name or logo once in the admin panel updates every
 * email automatically — no code changes or redeploys needed. */
export interface EmailBrand {
  siteTitle: string;
  logoUrl?: string | null | undefined;
}

function closing(brand: EmailBrand): string {
  return `
    <p style="margin-top:24px;">Sincerely,</p>
    <p style="margin:0;font-weight:600;">The ${brand.siteTitle}<br/>Membership Team</p>
  `;
}

function baseLayout(bodyHtml: string, brand: EmailBrand): string {
  const headerContent = brand.logoUrl
    ? `<img src="${brand.logoUrl}" alt="${brand.siteTitle}" height="36" style="display:block;height:36px;width:auto;" />`
    : `<span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:0.02em;">${brand.siteTitle}</span>`;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f8fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background:${BRAND_COLOR};padding:20px 28px;">
                ${headerContent}
              </td>
            </tr>
            <tr>
              <td style="padding:28px;color:#131b23;font-size:15px;line-height:1.65;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:#f6f8fb;color:#5b6b7c;font-size:12px;line-height:1.5;">
                This is an automated message from the ${brand.siteTitle} membership portal. Please do not reply directly to this email — if you need assistance, kindly contact us through the Contact page on our website.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:6px;font-weight:600;font-size:14px;margin-top:18px;">${label}</a>`;
}

export function applicationReceivedEmail(params: { firstName: string; indexNumber: string; brand: EmailBrand }) {
  const { firstName, indexNumber, brand } = params;
  return {
    subject: "Confirmation of Receipt — Membership Application",
    html: baseLayout(
      `
      <p>Dear ${firstName},</p>
      <p>We are writing to confirm that your membership application (Index Number: <strong>${indexNumber}</strong>) has been successfully received and is now under review by our membership team.</p>
      <p>You will be notified by email once a decision has been reached. No further action is required from you at this time.</p>
      <p>Thank you for your interest in joining the association.</p>
      ${closing(brand)}
    `,
      brand,
    ),
  };
}

export function applicationApprovedEmail(params: {
  firstName: string;
  indexNumber: string;
  temporaryPassword: string;
  loginUrl: string;
  brand: EmailBrand;
}) {
  const { firstName, indexNumber, temporaryPassword, loginUrl, brand } = params;
  return {
    subject: "Your Membership Application Has Been Approved",
    html: baseLayout(
      `
      <p>Dear ${firstName},</p>
      <p>We are pleased to inform you that your membership application has been <strong>approved</strong>. Your member account has been created and is now ready for use.</p>
      <table role="presentation" style="width:100%;background:#eef0fb;border-radius:6px;margin:18px 0;">
        <tr><td style="padding:14px 18px;">
          <div style="font-size:12px;color:#5b6b7c;text-transform:uppercase;letter-spacing:0.04em;">Index Number (Username)</div>
          <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:15px;margin-bottom:10px;">${indexNumber}</div>
          <div style="font-size:12px;color:#5b6b7c;text-transform:uppercase;letter-spacing:0.04em;">Temporary Password (Your Phone Number, Digits Only)</div>
          <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:15px;">${temporaryPassword}</div>
        </td></tr>
      </table>
      <p>For your security, we strongly advise that you log in and change this temporary password immediately. You will be prompted to do so automatically upon your first login.</p>
      ${button(loginUrl, "Log In to the Membership Portal")}
      <p style="margin-top:22px;">We are delighted to welcome you as a member of our association.</p>
      ${closing(brand)}
    `,
      brand,
    ),
  };
}

export function applicationChangesRequestedEmail(params: { firstName: string; adminNote: string; brand: EmailBrand }) {
  const { firstName, adminNote, brand } = params;
  return {
    subject: "Additional Information Required — Membership Application",
    html: baseLayout(
      `
      <p>Dear ${firstName},</p>
      <p>Thank you for submitting your membership application. In the course of our review, we have identified that additional information is required before we are able to proceed.</p>
      <p style="background:#fdf1e3;border-radius:6px;padding:14px 16px;">${adminNote}</p>
      <p>Kindly get in touch with us via the Contact page on our website, providing the details requested above, so that we may continue processing your application.</p>
      ${closing(brand)}
    `,
      brand,
    ),
  };
}

export function applicationRejectedEmail(params: { firstName: string; adminNote?: string | null; brand: EmailBrand }) {
  const { firstName, adminNote, brand } = params;
  return {
    subject: "Update Regarding Your Membership Application",
    html: baseLayout(
      `
      <p>Dear ${firstName},</p>
      <p>Thank you for your interest in joining the association and for taking the time to submit an application.</p>
      <p>After careful review, we regret to inform you that we are unable to approve your membership application at this time.</p>
      ${adminNote ? `<p style="background:#fdf1e3;border-radius:6px;padding:14px 16px;">${adminNote}</p>` : ""}
      <p>Should you believe this decision was made in error, or should your circumstances change, you are welcome to contact us via the Contact page on our website.</p>
      <p>We appreciate your understanding and thank you again for your interest.</p>
      ${closing(brand)}
    `,
      brand,
    ),
  };
}

export function profileUpdatedEmail(params: { firstName: string; changedFields: string[]; brand: EmailBrand }) {
  const { firstName, changedFields, brand } = params;
  const fieldList = changedFields.length
    ? `<ul style="margin:10px 0 0;padding-left:20px;">${changedFields.map((f) => `<li>${f}</li>`).join("")}</ul>`
    : "";
  return {
    subject: "Confirmation — Your Profile Has Been Updated",
    html: baseLayout(
      `
      <p>Dear ${firstName},</p>
      <p>This email confirms that the following information on your membership portal profile was recently updated:</p>
      ${fieldList}
      <p style="margin-top:18px;color:#5b6b7c;font-size:13px;">If you did not make this change, please contact us via the Contact page immediately so that we may assist you.</p>
      ${closing(brand)}
    `,
      brand,
    ),
  };
}

export function passwordResetEmail(params: { firstName: string; resetUrl: string; brand: EmailBrand }) {
  const { firstName, resetUrl, brand } = params;
  return {
    subject: "Password Reset Request — Membership Portal",
    html: baseLayout(
      `
      <p>Dear ${firstName},</p>
      <p>We received a request to reset the password associated with your membership portal account. Please use the button below to proceed. For your security, this link will expire in 30 minutes and may only be used once.</p>
      ${button(resetUrl, "Reset Your Password")}
      <p style="margin-top:18px;color:#5b6b7c;font-size:13px;">If you did not request this change, no action is required — your password will remain unchanged.</p>
      ${closing(brand)}
    `,
      brand,
    ),
  };
}

export function adminNewApplicationNotificationEmail(params: {
  applicantName: string;
  indexNumber: string;
  reviewUrl: string;
  brand: EmailBrand;
}) {
  const { applicantName, indexNumber, reviewUrl, brand } = params;
  return {
    subject: `New Membership Application Submitted — ${applicantName}`,
    html: baseLayout(
      `
      <p>A new membership application has been submitted and is awaiting review.</p>
      <p><strong>Applicant:</strong> ${applicantName}<br/><strong>Index Number:</strong> ${indexNumber}</p>
      ${button(reviewUrl, "Review Application")}
    `,
      brand,
    ),
  };
}

export function adminNewContactMessageEmail(params: {
  name: string;
  subject: string;
  reviewUrl: string;
  brand: EmailBrand;
}) {
  const { name, subject, reviewUrl, brand } = params;
  return {
    subject: `New Contact Message — ${subject}`,
    html: baseLayout(
      `
      <p>A new message has been submitted through the Contact page.</p>
      <p><strong>From:</strong> ${name}<br/><strong>Subject:</strong> ${subject}</p>
      ${button(reviewUrl, "View Message")}
    `,
      brand,
    ),
  };
}
