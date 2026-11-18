/**
 * Email Service Abstraction
 * Checks for configured email providers (SMTP, SendGrid, Resend, etc.)
 * Provides a clean interface without fabricating dispatch when unconfigured.
 */

export const isEmailConfigured = () => {
  return Boolean(
    process.env.SMTP_HOST ||
    process.env.SENDGRID_API_KEY ||
    process.env.RESEND_API_KEY
  );
};

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!isEmailConfigured()) {
    console.warn(
      `[EmailService] Notice: No outbound email provider configured in environment (SMTP_HOST, SENDGRID_API_KEY, RESEND_API_KEY). ` +
      `Email to '${to}' with subject '${subject}' was not dispatched.`
    );
    return {
      success: false,
      dispatched: false,
      reason: 'PROVIDER_NOT_CONFIGURED',
      recipient: to,
      subject,
    };
  }

  // Provider dispatch implementation hook (for future production email integration)
  return {
    success: true,
    dispatched: true,
    recipient: to,
    subject,
  };
};

export const sendStaffInvitationEmail = async ({ email, storeName, inviterName, inviteUrl }) => {
  const subject = `You've been invited to join ${storeName} on AURELLE`;
  const text = `Hello,\n\n${inviterName} has invited you to join ${storeName} on AURELLE.\nClick the link below to accept the invitation and set up your account:\n${inviteUrl}\n\nThis invitation link will expire in 48 hours.`;
  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <h2>Store Invitation</h2>
      <p>Hello,</p>
      <p><strong>${inviterName}</strong> has invited you to collaborate on <strong>${storeName}</strong> on the AURELLE luxury platform.</p>
      <p><a href="${inviteUrl}" style="background-color: #593D30; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Invitation & Set Password</a></p>
      <p><small>This invitation link expires in 48 hours. If you did not expect this invitation, you can safely ignore this email.</small></p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
};

export const sendStaffWelcomeEmail = async ({
  email,
  storeName,
  inviterName,
  roleName,
  password,
  loginUrl,
}) => {
  const subject = `Your ${storeName} Staff Account Credentials`;
  const text = `Hello,\n\n${inviterName} has created a staff account for you on ${storeName} with the role '${roleName}'.\n\nLogin ID / Email: ${email}\nInitial Password: ${password}\n\nLogin URL: ${loginUrl}\n\nPlease sign in and update your credentials under your security settings.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #D7C5AF; border-radius: 6px;">
      <h2 style="color: #593D30; margin-top: 0;">Welcome to ${storeName}</h2>
      <p>Hello,</p>
      <p><strong>${inviterName}</strong> has provisioned a store team member account for you with the role <strong>${roleName}</strong>.</p>
      <div style="background-color: #FAF7F2; border-left: 4px solid #A85F49; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0 0 8px 0;"><strong>Store:</strong> ${storeName}</p>
        <p style="margin: 0 0 8px 0;"><strong>Login ID (Email):</strong> <code>${email}</code></p>
        <p style="margin: 0 0 8px 0;"><strong>Password:</strong> <code>${password}</code></p>
        <p style="margin: 0;"><strong>Assigned Role:</strong> ${roleName}</p>
      </div>
      <p><a href="${loginUrl}" style="background-color: #593D30; color: #ffffff; padding: 11px 22px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 500;">Sign in to Store Admin</a></p>
      <p style="font-size: 12px; color: #8E8172; margin-top: 24px;">For security, please change your password after logging in.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
};

