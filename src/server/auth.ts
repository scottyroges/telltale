import "server-only";

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error("GOOGLE_CLIENT_ID environment variable is required");
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("GOOGLE_CLIENT_SECRET environment variable is required");
}

function getBaseUrl(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

const baseUrl = getBaseUrl();

// Generate trusted origins: support both www and non-www versions
function getTrustedOrigins(url: string): string[] {
  const origins = [url];

  // Add www variant if base URL doesn't have it
  if (!url.includes("www.")) {
    origins.push(url.replace("://", "://www."));
  }
  // Add non-www variant if base URL has www
  if (url.includes("://www.")) {
    origins.push(url.replace("://www.", "://"));
  }

  return origins;
}

const socialProviders = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
};

export const auth = betterAuth({
  baseURL: baseUrl,
  trustedOrigins: getTrustedOrigins(baseUrl),
  database: { db, type: "postgres" as const },
  socialProviders,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(
        user.email,
        "Reset your password",
        `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Telltale</h1>
          <p>Click the button below to reset your password:</p>
          <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #0070f3; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a>
          <p style="margin-top: 20px; font-size: 14px; color: #666;">If you didn't request this, you can safely ignore this email.</p>
        </div>
        `
      );
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 86400, // 24 hours
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(
        user.email,
        "Verify your email",
        `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Telltale</h1>
          <p>Click the button below to verify your email address:</p>
          <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #0070f3; color: white; text-decoration: none; border-radius: 4px;">Verify Email</a>
        </div>
        `
      );
    },
  },
  plugins: [nextCookies()],
});
