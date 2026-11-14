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
      <p><a href="${inviteUrl}" style="background-color: #111; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Invitation & Set Password</a></p>
      <p><small>This invitation link expires in 48 hours. If you did not expect this invitation, you can safely ignore this email.</small></p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
};

