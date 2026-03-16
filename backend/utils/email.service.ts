import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";
const APP_NAME = "ProjectFlow";

// ─── App color tokens (mirrors tailwind.config.ts) ───────────────────────────
const C = {
  bg: "#101214",          // dark-bg
  surface: "#1d1f21",     // dark-secondary
  border: "#2d3135",      // stroke-dark
  blue: "#0275ff",        // blue-primary
  white: "#ffffff",
  textMuted: "#9ca3af",
  textBody: "#374151",
};

// ─── Shared layout wrapper ────────────────────────────────────────────────────
function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:${C.bg};padding:28px 40px;border-radius:12px 12px 0 0;">
            <table cellpadding="0" cellspacing="0"><tr>
              <!-- Logo: amber border square with amber dot inside -->
              <td style="vertical-align:middle;padding-right:10px;">
                <div style="width:24px;height:24px;border:2px solid #f59e0b;display:flex;align-items:center;justify-content:center;">
                  <div style="width:9px;height:9px;background:#f59e0b;"></div>
                </div>
              </td>
              <td style="vertical-align:middle;">
                <span style="font-size:15px;font-weight:700;color:${C.white};letter-spacing:0.15em;text-transform:uppercase;">${APP_NAME}</span>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:${C.white};padding:40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;text-align:center;">
            <p style="margin:0;font-size:12px;color:${C.textMuted};">
              You received this email because an action was triggered on your ${APP_NAME} account.
              <br/>If you didn't request this, you can safely ignore it.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Shared CTA button ────────────────────────────────────────────────────────
function ctaButton(label: string, url: string): string {
  return `<a href="${url}" style="
    display:inline-block;
    padding:12px 28px;
    background:${C.blue};
    color:${C.white};
    font-size:14px;
    font-weight:600;
    border-radius:8px;
    text-decoration:none;
    letter-spacing:0.1px;
  ">${label}</a>`;
}

// ─── Divider ──────────────────────────────────────────────────────────────────
const divider = `<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />`;

// ─── Heading ──────────────────────────────────────────────────────────────────
function heading(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">${text}</h1>`;
}

// ─── Body text ────────────────────────────────────────────────────────────────
function bodyText(text: string): string {
  return `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${C.textBody};">${text}</p>`;
}

// ─── URL fallback text ────────────────────────────────────────────────────────
function fallbackUrl(url: string): string {
  return `<p style="margin:16px 0 0;font-size:12px;color:${C.textMuted};">
    Or copy this link: <span style="color:${C.blue};word-break:break-all;">${url}</span>
  </p>`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Email senders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a password reset email.
 */
export const sendPasswordResetEmail = async (to: string, resetUrl: string) => {
  const content = `
    ${heading("Reset your password")}
    ${bodyText("We received a request to reset the password for your ProjectFlow account. Click the button below to choose a new password.")}
    <div style="margin:28px 0;">
      ${ctaButton("Reset Password", resetUrl)}
    </div>
    ${fallbackUrl(resetUrl)}
    ${divider}
    <p style="margin:0;font-size:13px;color:${C.textMuted};">This link expires in <strong>15 minutes</strong>. If you didn't request a password reset, no action is needed.</p>
  `;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `${APP_NAME} — Reset your password`,
    html: emailWrapper(content),
  });
};

/**
 * Sends an email verification link.
 */
export const sendVerificationEmail = async (to: string, verifyUrl: string) => {
  const content = `
    ${heading("Verify your email address")}
    ${bodyText("Thanks for signing up for ProjectFlow! Please verify your email address to activate your account and get started.")}
    <div style="margin:28px 0;">
      ${ctaButton("Verify Email", verifyUrl)}
    </div>
    ${fallbackUrl(verifyUrl)}
    ${divider}
    <p style="margin:0;font-size:13px;color:${C.textMuted};">This link expires in <strong>24 hours</strong>.</p>
  `;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `${APP_NAME} — Verify your email`,
    html: emailWrapper(content),
  });
};

/**
 * Sends a "you've been added to a project" notification email.
 */
export const sendProjectAddedEmail = async (
  to: string,
  projectName: string,
  workspaceName: string,
  projectUrl: string
) => {
  const content = `
    ${heading("You've been added to a project")}
    ${bodyText(`You've been added as a member of <strong style="color:#111827;">${projectName}</strong> in the <strong style="color:#111827;">${workspaceName}</strong> workspace on ProjectFlow.`)}
    <div style="margin:28px 0;">
      ${ctaButton("View Project", projectUrl)}
    </div>
    ${fallbackUrl(projectUrl)}
    ${divider}
    <p style="margin:0;font-size:13px;color:${C.textMuted};">You can now view and collaborate on tasks in this project.</p>
  `;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `You've been added to "${projectName}" on ${APP_NAME}`,
    html: emailWrapper(content),
  });
};

/**
 * Sends a workspace invite email.
 */
export const sendWorkspaceInviteEmail = async (
  to: string,
  workspaceName: string,
  inviteUrl: string
) => {
  const content = `
    ${heading("You've been invited")}
    ${bodyText(`You've been invited to join the <strong style="color:#111827;">${workspaceName}</strong> workspace on ProjectFlow. Accept the invite to start collaborating with your team.`)}
    <div style="margin:28px 0;">
      ${ctaButton("Accept Invite", inviteUrl)}
    </div>
    ${fallbackUrl(inviteUrl)}
    ${divider}
    <p style="margin:0;font-size:13px;color:${C.textMuted};">This invite expires in <strong>7 days</strong>. If you don't have a ProjectFlow account yet, you'll be able to create one after clicking the link.</p>
  `;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `You've been invited to join "${workspaceName}" on ${APP_NAME}`,
    html: emailWrapper(content),
  });
};
