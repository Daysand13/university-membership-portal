const BRAND_COLOR = "#123A73";

/** Everything the email layout needs to look like it actually belongs to
 * this association, pulled from Site Settings rather than hardcoded, so
 * updating the org name or logo once in the admin panel updates every
 * email automatically — no code changes or redeploys needed. */
export interface EmailBrand {
  siteTitle: string;
  logoUrl?: string | null | undefined;
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
              <td style="padding:28px;color:#131b23;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:#f6f8fb;color:#5b6b7c;font-size:12px;">
                This is an automated message from the ${brand.siteTitle} membership portal. Please do not reply directly to this email.
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
  return `<a href="${url}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;font-size:14px;margin-top:16px;">${label}</a>`;
}

export function applicationReceivedEmail(params: { firstName: string; indexNumber: string; brand: EmailBrand }) {
  const { firstName, indexNumber, brand } = params;
  return {
    subject: "We've received your membership application",
    html: baseLayout(
      `
      <p>Hi ${firstName},</p>
      <p>Thanks for applying for membership. We've received your application (index number <strong>${indexNumber}</strong>) and it's now in front of our membership team for review.</p>
      <p>We'll email you again as soon as a decision is made — there's nothing further you need to do right now.</p>
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
    subject: "Your membership has been approved",
    html: baseLayout(
      `
      <p>Hi ${firstName},</p>
      <p>Good news — your membership application has been <strong>approved</strong>. Your member account is ready.</p>
      <table role="presentation" style="width:100%;background:#eef3fb;border-radius:6px;margin:16px 0;">
        <tr><td style="padding:14px 18px;">
          <div style="font-size:12px;color:#5b6b7c;text-transform:uppercase;letter-spacing:0.04em;">Index Number (username)</div>
          <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:15px;margin-bottom:10px;">${indexNumber}</div>
          <div style="font-size:12px;color:#5b6b7c;text-transform:uppercase;letter-spacing:0.04em;">Temporary Password (your phone number, digits only)</div>
          <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:15px;">${temporaryPassword}</div>
        </td></tr>
      </table>
      <p>For your security, please log in and change this password immediately — you'll be prompted automatically on first login.</p>
      ${button(loginUrl, "Log in to the Membership Portal")}
    `,
      brand,
    ),
  };
}

export function applicationChangesRequestedEmail(params: { firstName: string; adminNote: string; brand: EmailBrand }) {
  const { firstName, adminNote, brand } = params;
  return {
    subject: "Action needed on your membership application",
    html: baseLayout(
      `
      <p>Hi ${firstName},</p>
      <p>We're reviewing your membership application and need a bit more information before we can proceed.</p>
      <p style="background:#fdf1e3;border-radius:6px;padding:12px 16px;">${adminNote}</p>
      <p>Please get in touch via the Contact page with the requested details and we'll continue the review.</p>
    `,
      brand,
    ),
  };
}

export function applicationRejectedEmail(params: { firstName: string; adminNote?: string | null; brand: EmailBrand }) {
  const { firstName, adminNote, brand } = params;
  return {
    subject: "Update on your membership application",
    html: baseLayout(
      `
      <p>Hi ${firstName},</p>
      <p>Thank you for your interest in joining. After review, we're not able to approve your membership application at this time.</p>
      ${adminNote ? `<p style="background:#fdf1e3;border-radius:6px;padding:12px 16px;">${adminNote}</p>` : ""}
      <p>If you believe this was a mistake or your circumstances change, you're welcome to get in touch with us via the Contact page.</p>
    `,
      brand,
    ),
  };
}

export function profileUpdatedEmail(params: { firstName: string; changedFields: string[]; brand: EmailBrand }) {
  const { firstName, changedFields, brand } = params;
  const fieldList = changedFields.length
    ? `<ul style="margin:8px 0 0;padding-left:20px;">${changedFields.map((f) => `<li>${f}</li>`).join("")}</ul>`
    : "";
  return {
    subject: "Your profile was updated",
    html: baseLayout(
      `
      <p>Hi ${firstName},</p>
      <p>This confirms your membership portal profile was just updated.</p>
      ${fieldList}
      <p style="margin-top:16px;color:#5b6b7c;font-size:13px;">If you didn't make this change, please contact us via the Contact page right away.</p>
    `,
      brand,
    ),
  };
}

export function passwordResetEmail(params: { firstName: string; resetUrl: string; brand: EmailBrand }) {
  const { firstName, resetUrl, brand } = params;
  return {
    subject: "Reset your membership portal password",
    html: baseLayout(
      `
      <p>Hi ${firstName},</p>
      <p>We received a request to reset your membership portal password. This link will expire in 30 minutes and can only be used once.</p>
      ${button(resetUrl, "Reset Password")}
      <p style="margin-top:16px;color:#5b6b7c;font-size:13px;">If you didn't request this, you can safely ignore this email — your password will not change.</p>
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
    subject: `New membership application: ${applicantName}`,
    html: baseLayout(
      `
      <p>A new membership application has been submitted.</p>
      <p><strong>${applicantName}</strong> (${indexNumber}) is waiting for review.</p>
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
    subject: `New contact message: ${subject}`,
    html: baseLayout(
      `
      <p>A new contact form message has arrived from <strong>${name}</strong>.</p>
      <p><strong>Subject:</strong> ${subject}</p>
      ${button(reviewUrl, "View Message")}
    `,
      brand,
    ),
  };
}
