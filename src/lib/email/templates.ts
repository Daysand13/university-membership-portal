const BRAND_COLOR = "#24266B";

/** Everything the email layout needs to look like it actually belongs to
 * this association, pulled from Site Settings rather than hardcoded, so
 * updating the org name or logo once in the admin panel updates every
 * email automatically — no code changes or redeploys needed. */
export interface EmailBrand {
  siteTitle: string;
  logoUrl?: string | null | undefined;
}

/**
 * Every value interpolated into these templates goes through this. Names,
 * notes and positions are typed by applicants and administrators, and an
 * email body is HTML — an unescaped "<" in a name could break the layout or
 * slip markup and links into a message sent under the association's name.
 */
export function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const e = escapeHtml;

/** Escaped, with the writer's own line breaks kept. */
function multiline(value: string): string {
  return e(value).replace(/\r?\n/g, "<br/>");
}

function closing(brand: EmailBrand): string {
  return `
    <p style="margin-top:24px;">Sincerely,</p>
    <p style="margin:0;font-weight:600;">The ${e(brand.siteTitle)}<br/>Membership Team</p>
  `;
}

function baseLayout(bodyHtml: string, brand: EmailBrand): string {
  const headerContent = brand.logoUrl
    ? `<img src="${e(brand.logoUrl)}" alt="${e(brand.siteTitle)}" height="36" style="display:block;height:36px;width:auto;" />`
    : `<span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:0.02em;">${e(brand.siteTitle)}</span>`;

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
                This is an automated message from the ${e(brand.siteTitle)} membership portal. Please do not reply directly to this email — if you need assistance, kindly contact us through the Contact page on our website.
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
  return `<a href="${e(url)}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:6px;font-weight:600;font-size:14px;margin-top:18px;">${e(label)}</a>`;
}

export function applicationReceivedEmail(params: { firstName: string; indexNumber: string; brand: EmailBrand }) {
  const { firstName, indexNumber, brand } = params;
  return {
    subject: "Confirmation of Receipt — Membership Application",
    html: baseLayout(
      `
      <p>Dear ${e(firstName)},</p>
      <p>We are writing to confirm that your membership application (Index Number: <strong>${e(indexNumber)}</strong>) has been successfully received and is now under review by our membership team.</p>
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
      <p>Dear ${e(firstName)},</p>
      <p>We are pleased to inform you that your membership application has been <strong>approved</strong>. Your member account has been created and is now ready for use.</p>
      <table role="presentation" style="width:100%;background:#eef0fb;border-radius:6px;margin:18px 0;">
        <tr><td style="padding:14px 18px;">
          <div style="font-size:12px;color:#5b6b7c;text-transform:uppercase;letter-spacing:0.04em;">Index Number (Username)</div>
          <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:15px;margin-bottom:10px;">${e(indexNumber)}</div>
          <div style="font-size:12px;color:#5b6b7c;text-transform:uppercase;letter-spacing:0.04em;">Temporary Password (Your Phone Number, Digits Only)</div>
          <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:15px;">${e(temporaryPassword)}</div>
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
      <p>Dear ${e(firstName)},</p>
      <p>Thank you for submitting your membership application. In the course of our review, we have identified that additional information is required before we are able to proceed.</p>
      <p style="background:#fdf1e3;border-radius:6px;padding:14px 16px;">${multiline(adminNote)}</p>
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
      <p>Dear ${e(firstName)},</p>
      <p>Thank you for your interest in joining the association and for taking the time to submit an application.</p>
      <p>After careful review, we regret to inform you that we are unable to approve your membership application at this time.</p>
      ${adminNote ? `<p style="background:#fdf1e3;border-radius:6px;padding:14px 16px;">${multiline(adminNote)}</p>` : ""}
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
    ? `<ul style="margin:10px 0 0;padding-left:20px;">${changedFields.map((f) => `<li>${e(f)}</li>`).join("")}</ul>`
    : "";
  return {
    subject: "Confirmation — Your Profile Has Been Updated",
    html: baseLayout(
      `
      <p>Dear ${e(firstName)},</p>
      <p>This email confirms that the following information on your membership portal profile was recently updated:</p>
      ${fieldList}
      <p style="margin-top:18px;color:#5b6b7c;font-size:13px;">If you did not make this change, please contact us via the Contact page immediately so that we may assist you.</p>
      ${closing(brand)}
    `,
      brand,
    ),
  };
}

export function alumniGraduationInviteEmail(params: { firstName: string; setPasswordUrl: string; brand: EmailBrand }) {
  const { firstName, setPasswordUrl, brand } = params;
  return {
    subject: "Welcome to the Alumni Network",
    html: baseLayout(
      `
      <p>Dear ${e(firstName)},</p>
      <p>Congratulations on your graduation! You have been automatically added to the ${e(brand.siteTitle)} Alumni Network, and an alumni portal account has been created for you.</p>
      <p>Please set a password for your new account to get started. This link will expire in 30 minutes.</p>
      ${button(setPasswordUrl, "Set Your Alumni Password")}
      <p style="margin-top:18px;">Through the Alumni Portal you will be able to connect with fellow graduates in the member directory, offer or seek mentorship, and stay informed about upcoming events and reunions.</p>
      ${closing(brand)}
    `,
      brand,
    ),
  };
}

export function alumniDualMembershipInviteEmail(params: { firstName: string; setPasswordUrl: string; brand: EmailBrand }) {
  const { firstName, setPasswordUrl, brand } = params;
  return {
    subject: "Set up your Alumni Portal account",
    html: baseLayout(
      `
      <p>Dear ${e(firstName)},</p>
      <p>Your postgraduate membership application has been approved. Because you told us you are a graduate of the University of Education, Winneba, you now have dual membership: the Student Portal for your current studies, and the ${e(brand.siteTitle)} Alumni Network as a UEW graduate.</p>
      <p>Your approval email explains how to sign in to the Student Portal. To use the Alumni Portal too, please set a password for your alumni account.</p>
      ${button(setPasswordUrl, "Set Your Alumni Password")}
      <p style="margin-top:18px;color:#5b6b7c;font-size:13px;">If this link has expired, use &ldquo;Forgot password&rdquo; on the Alumni Portal sign-in page to get a new one.</p>
      <p style="margin-top:18px;">Through the Alumni Portal you can connect with fellow graduates in the member directory, offer or seek mentorship, and stay informed about upcoming events and reunions.</p>
      ${closing(brand)}
    `,
      brand,
    ),
  };
}

export function alumniWelcomeEmail(params: { firstName: string; brand: EmailBrand }) {
  const { firstName, brand } = params;
  return {
    subject: "Welcome to the Alumni Network",
    html: baseLayout(
      `
      <p>Dear ${e(firstName)},</p>
      <p>Thank you for registering with the ${e(brand.siteTitle)} Alumni Network. Your account is now active.</p>
      <p>You can now sign in to the Alumni Portal to browse the member directory, offer or seek mentorship, and stay informed about upcoming events and reunions.</p>
      ${closing(brand)}
    `,
      brand,
    ),
  };
}

export function alumniPasswordResetEmail(params: { firstName: string; resetUrl: string; brand: EmailBrand }) {
  const { firstName, resetUrl, brand } = params;
  return {
    subject: "Reset Your Alumni Portal Password",
    html: baseLayout(
      `
      <p>Dear ${e(firstName)},</p>
      <p>We received a request to reset the password associated with your Alumni Portal account. Please use the button below to proceed. For your security, this link will expire in 30 minutes and may only be used once.</p>
      ${button(resetUrl, "Reset Your Password")}
      <p style="margin-top:18px;color:#5b6b7c;font-size:13px;">If you did not request this, no action is required — your password will remain unchanged.</p>
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
      <p>Dear ${e(firstName)},</p>
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
      <p><strong>Applicant:</strong> ${e(applicantName)}<br/><strong>Index Number:</strong> ${e(indexNumber)}</p>
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
      <p><strong>From:</strong> ${e(name)}<br/><strong>Subject:</strong> ${e(subject)}</p>
      ${button(reviewUrl, "View Message")}
    `,
      brand,
    ),
  };
}

export interface NoticeDetail {
  label: string;
  value: string;
}

/**
 * The one layout behind every "something changed on your account" email
 * (see lib/services/account-notification-service.ts): a greeting, what
 * happened in plain sentences, the specifics in a highlighted panel, and an
 * optional button. All text is plain and escaped here — callers never pass
 * HTML.
 */
export function accountNoticeEmail(params: {
  firstName: string;
  subject: string;
  paragraphs: string[];
  bullets?: string[];
  details?: NoticeDetail[];
  closingParagraphs?: string[];
  cta?: { url: string; label: string } | null;
  /** Adds the "if you didn't expect this" line, for anything security-relevant. */
  securityNote?: boolean;
  brand: EmailBrand;
}) {
  const { firstName, subject, paragraphs, bullets, details, closingParagraphs, cta, securityNote, brand } = params;

  const bulletList = bullets?.length
    ? `<ul style="margin:10px 0 0;padding-left:20px;">${bullets.map((b) => `<li style="margin-bottom:6px;">${e(b)}</li>`).join("")}</ul>`
    : "";

  const detailPanel = details?.length
    ? `<table role="presentation" style="width:100%;background:#eef0fb;border-radius:6px;margin:18px 0;">
        <tr><td style="padding:14px 18px;">
          ${details
            .map(
              (d, i) =>
                `<div style="font-size:12px;color:#5b6b7c;text-transform:uppercase;letter-spacing:0.04em;">${e(d.label)}</div>` +
                `<div style="font-size:15px;font-weight:600;${i < details.length - 1 ? "margin-bottom:10px;" : ""}">${e(d.value)}</div>`,
            )
            .join("")}
        </td></tr>
      </table>`
    : "";

  return {
    subject,
    html: baseLayout(
      `
      <p>Dear ${e(firstName)},</p>
      ${paragraphs.map((p) => `<p>${multiline(p)}</p>`).join("")}
      ${bulletList}
      ${detailPanel}
      ${(closingParagraphs ?? []).map((p) => `<p>${multiline(p)}</p>`).join("")}
      ${cta ? button(cta.url, cta.label) : ""}
      ${
        securityNote
          ? `<p style="margin-top:18px;color:#5b6b7c;font-size:13px;">If you did not expect this change, please contact us through the Contact page on our website straight away so that we can help.</p>`
          : ""
      }
      ${closing(brand)}
    `,
      brand,
    ),
  };
}

/**
 * A broadcast to a group: either a patron's, approved by an administrator,
 * or an executive's own. `bodyHtml` must already be sanitised (see
 * broadcast-service); it is the one place in these templates where HTML is
 * passed in rather than built here, because the sender wrote rich text.
 *
 * `sender` decides how it's introduced and signed — an executive's
 * message must never go out labelled as a patron's. `unsubscribeUrl` is
 * set for allies, who joined a mailing list rather than holding an account,
 * and so must always be able to leave it from the email itself.
 */
export function patronBroadcastEmail(params: {
  firstName: string;
  subject: string;
  bodyHtml: string;
  authorName: string;
  audienceLabel: string;
  sender?: "patron" | "executive";
  attachment?: { url: string; name: string } | null;
  portalUrl?: string | null;
  unsubscribeUrl?: string | null;
  brand: EmailBrand;
}) {
  const { firstName, subject, bodyHtml, authorName, audienceLabel, attachment, portalUrl, unsubscribeUrl, brand } = params;
  const executive = params.sender === "executive";
  return {
    subject,
    html: baseLayout(
      `
      <p style="margin:0 0 4px;font-size:12px;color:#5b6b7c;text-transform:uppercase;letter-spacing:0.04em;">${executive ? "Message from the Executive Committee" : "Message from a Patron"} · ${e(audienceLabel)}</p>
      <p style="margin:0 0 18px;font-size:18px;font-weight:700;color:${BRAND_COLOR};">${e(subject)}</p>
      <p>Dear ${e(firstName)},</p>
      <div style="font-size:15px;line-height:1.65;">${bodyHtml}</div>
      <p style="margin-top:20px;font-weight:600;">${e(authorName)}<br/><span style="font-weight:400;color:#5b6b7c;">${executive ? "" : "Patron, "}${e(brand.siteTitle)}</span></p>
      ${
        attachment
          ? `<table role="presentation" style="width:100%;background:#eef0fb;border-radius:6px;margin:18px 0;"><tr><td style="padding:14px 18px;">
              <div style="font-size:12px;color:#5b6b7c;text-transform:uppercase;letter-spacing:0.04em;">Attachment</div>
              <a href="${e(attachment.url)}" style="font-size:15px;font-weight:600;color:${BRAND_COLOR};">${e(attachment.name)}</a>
            </td></tr></table>`
          : ""
      }
      ${portalUrl ? button(portalUrl, "Open Your Portal") : ""}
      ${
        executive
          ? ""
          : `<p style="margin-top:18px;color:#5b6b7c;font-size:13px;">This message was reviewed and approved by the ${e(brand.siteTitle)} before it was sent.</p>`
      }
      ${
        unsubscribeUrl
          ? `<p style="margin-top:18px;color:#5b6b7c;font-size:13px;">You're receiving this because you joined the ${e(brand.siteTitle)} ally network. <a href="${e(unsubscribeUrl)}" style="color:#5b6b7c;">Unsubscribe</a>.</p>`
          : ""
      }
    `,
      brand,
    ),
  };
}

/**
 * The invitation that is the only way into a newly created administrator
 * account: it has no password until the person chooses one here.
 */
export function adminInviteEmail(params: { name: string; roleLabel: string; setPasswordUrl: string; brand: EmailBrand }) {
  const { name, roleLabel, setPasswordUrl, brand } = params;
  return {
    subject: `Set up your ${brand.siteTitle} administrator account`,
    html: baseLayout(
      `
      <p>Dear ${e(name)},</p>
      <p>An administrator account has been created for you on the ${e(brand.siteTitle)} portal, as <strong>${e(roleLabel)}</strong>.</p>
      <p>Choose your password to finish setting it up. Nobody else knows it, and nobody else can sign in as you until you do. This link works for 14 days.</p>
      ${button(setPasswordUrl, "Choose Your Password")}
      <p style="margin-top:18px;color:#5b6b7c;font-size:13px;">If the link has expired, ask a super administrator to send you a new one. If you weren&rsquo;t expecting this, you can ignore this email — the account cannot be used until a password is set.</p>
      ${closing(brand)}
    `,
      brand,
    ),
  };
}
