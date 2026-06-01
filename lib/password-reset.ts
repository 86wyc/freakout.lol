import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1_000;
const PASSWORD_RESET_IDENTIFIER_PREFIX = "password-reset:";

export type PasswordResetTokenStatus = "valid" | "invalid" | "expired";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildPasswordResetIdentifier(userId: string): string {
  return `${PASSWORD_RESET_IDENTIFIER_PREFIX}${userId}`;
}

function buildPasswordResetWhere(input: { userId: string; token: string }) {
  return {
    identifier_token: {
      identifier: buildPasswordResetIdentifier(input.userId),
      token: hashToken(input.token),
    },
  };
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");

  await clearPasswordResetToken(userId);
  await db.verificationToken.create({
    data: {
      identifier: buildPasswordResetIdentifier(userId),
      token: hashToken(token),
      expires: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    },
  });

  return token;
}

export async function clearPasswordResetToken(userId: string) {
  await db.verificationToken.deleteMany({
    where: { identifier: buildPasswordResetIdentifier(userId) },
  });
}

export async function getPasswordResetTokenStatus(input: {
  userId: string;
  token: string;
}): Promise<PasswordResetTokenStatus> {
  const where = buildPasswordResetWhere(input);
  const resetToken = await db.verificationToken.findUnique({ where });

  if (!resetToken) {
    return "invalid";
  }

  if (resetToken.expires < new Date()) {
    await db.verificationToken.delete({ where });
    return "expired";
  }

  return "valid";
}

export async function deletePasswordResetToken(input: {
  userId: string;
  token: string;
}) {
  await db.verificationToken.delete({
    where: buildPasswordResetWhere(input),
  });
}

export async function sendPasswordResetEmail(input: {
  email: string;
  name: string | null;
  userId: string;
  token: string;
}) {
  const { FROM_ADDRESS, getAppUrl, resend } = await import("@/lib/email");
  const resetUrl = new URL("/reset-password", getAppUrl());
  resetUrl.searchParams.set("id", input.userId);
  resetUrl.searchParams.set("token", input.token);

  const greeting = input.name ? `Hi ${input.name},` : "Hi,";
  const htmlGreeting = escapeHtml(greeting);
  const resetLink = resetUrl.toString();

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: input.email,
    subject: "Reset your Freakout password",
    html: `
      <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p>${htmlGreeting}</p>
        <p>A Freakout administrator sent you a password reset link.</p>
        <p>
          <a href="${resetLink}" style="display: inline-block; border-radius: 8px; background: #111827; color: #ffffff; padding: 10px 14px; text-decoration: none;">
            Reset password
          </a>
        </p>
        <p>This link expires in 1 hour.</p>
        <p>If you did not expect this email, you can ignore it.</p>
      </div>
    `,
    text: `${greeting}

A Freakout administrator sent you a password reset link:
${resetLink}

This link expires in 1 hour.

If you did not expect this email, you can ignore it.`,
  });
}
