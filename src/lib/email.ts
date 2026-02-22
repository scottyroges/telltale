import "server-only";
import { Resend } from "resend";

// Environment variable validation
if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is required");
}

if (!process.env.EMAIL_FROM) {
  throw new Error("EMAIL_FROM environment variable is required");
}

const resend = new Resend(process.env.RESEND_API_KEY);
const emailFrom = process.env.EMAIL_FROM;

/**
 * Send an email using Resend
 * @throws Error if email fails to send
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const result = await resend.emails.send({
    from: emailFrom,
    to,
    subject,
    html,
  });

  if (result.error) {
    throw new Error(`Failed to send email: ${result.error.message}`);
  }
}

/**
 * Generate HTML for email verification email
 */
export function getVerificationEmailHtml(verificationUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <h1 style="color: #333; font-size: 24px; margin-bottom: 24px;">Telltale</h1>
    <p style="color: #555; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
      Welcome to Telltale! Please verify your email address to complete your registration.
    </p>
    <p style="margin-bottom: 32px;">
      <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
        Verify Email Address
      </a>
    </p>
    <p style="color: #666; font-size: 14px; line-height: 20px;">
      If you didn't create an account with Telltale, you can safely ignore this email.
    </p>
    <p style="color: #999; font-size: 12px; margin-top: 32px; padding-top: 32px; border-top: 1px solid #eee;">
      This link will expire in 24 hours.
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML for password reset email
 */
export function getPasswordResetEmailHtml(resetUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <h1 style="color: #333; font-size: 24px; margin-bottom: 24px;">Telltale</h1>
    <p style="color: #555; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
      We received a request to reset your password. Click the button below to create a new password.
    </p>
    <p style="margin-bottom: 32px;">
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
        Reset Password
      </a>
    </p>
    <p style="color: #666; font-size: 14px; line-height: 20px;">
      If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
    </p>
    <p style="color: #999; font-size: 12px; margin-top: 32px; padding-top: 32px; border-top: 1px solid #eee;">
      This link will expire in 24 hours.
    </p>
  </div>
</body>
</html>
  `.trim();
}
