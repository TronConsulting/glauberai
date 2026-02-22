import nodemailer from 'nodemailer';

type ResetEmailOptions = {
  to: string;
  resetUrl: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error('SMTP configuration is incomplete');
  }

  return { host, port, user, pass };
}

export async function sendPasswordResetEmail({ to, resetUrl }: ResetEmailOptions) {
  const { host, port, user, pass } = getSmtpConfig();
  const from = process.env.SMTP_FROM || `GlauberAI <${user}>`;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass }
  });

  const subject = 'Reset your GlauberAI password';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Reset your password</h2>
      <p>We received a request to reset your password. If you made this request, click the button below:</p>
      <p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px;">
          Reset Password
        </a>
      </p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you didn’t request this, you can safely ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to,
    subject,
    html
  });
}
