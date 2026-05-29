import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1_000;
const EMAIL_CHANGE_IDENTIFIER_PREFIX = "email-change:";

export type EmailVerificationResult =
  | { status: "success" }
  | { status: "invalid" }
  | { status: "expired" };

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

function buildEmailChangeIdentifier(userId: string, email: string): string {
  return `${EMAIL_CHANGE_IDENTIFIER_PREFIX}${userId}:${email}`;
}

function parseEmailChangeIdentifier(
  identifier: string
): { userId: string; email: string } | null {
  if (!identifier.startsWith(EMAIL_CHANGE_IDENTIFIER_PREFIX)) {
    return null;
  }

  const withoutPrefix = identifier.slice(EMAIL_CHANGE_IDENTIFIER_PREFIX.length);
  const separatorIndex = withoutPrefix.indexOf(":");
  if (separatorIndex <= 0) {
    return null;
  }

  const userId = withoutPrefix.slice(0, separatorIndex);
  const email = withoutPrefix.slice(separatorIndex + 1);
  if (!userId || !email) {
    return null;
  }

  return { userId, email };
}

export async function createEmailVerificationToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");

  await db.verificationToken.deleteMany({
    where: { identifier: email },
  });
  await db.verificationToken.create({
    data: {
      identifier: email,
      token: hashToken(token),
      expires: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS),
    },
  });

  return token;
}

export async function createEmailChangeVerificationToken(input: {
  userId: string;
  email: string;
}): Promise<string> {
  const identifier = buildEmailChangeIdentifier(input.userId, input.email);
  const token = randomBytes(32).toString("base64url");

  await db.verificationToken.deleteMany({
    where: { identifier },
  });
  await db.verificationToken.create({
    data: {
      identifier,
      token: hashToken(token),
      expires: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS),
    },
  });

  return token;
}

export async function clearEmailChangeVerificationToken(input: {
  userId: string;
  email: string;
}) {
  await db.verificationToken.deleteMany({
    where: { identifier: buildEmailChangeIdentifier(input.userId, input.email) },
  });
}

export async function sendEmailVerification(input: {
  email: string;
  name: string | null;
  token: string;
  inviteToken?: string | null;
}) {
  const { FROM_ADDRESS, getAppUrl, resend } = await import("@/lib/email");
  const verifyUrl = new URL("/verify-email", getAppUrl());
  verifyUrl.searchParams.set("email", input.email);
  verifyUrl.searchParams.set("token", input.token);
  if (input.inviteToken) {
    verifyUrl.searchParams.set("invite", input.inviteToken);
  }

  const greeting = input.name ? `Hi ${input.name},` : "Hi,";
  const htmlGreeting = escapeHtml(greeting);
  const verifyLink = verifyUrl.toString();

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: input.email,
    subject: "Verify your Freakout email",
    html: `
      <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p>${htmlGreeting}</p>
        <p>Verify your email address to finish creating your Freakout account.</p>
        <p>
          <a href="${verifyLink}" style="display: inline-block; border-radius: 8px; background: #111827; color: #ffffff; padding: 10px 14px; text-decoration: none;">
            Verify email
          </a>
        </p>
        <p>This link expires in 24 hours.</p>
        <p>If you did not create this account, you can ignore this email.</p>
      </div>
    `,
    text: `${greeting}

Verify your email address to finish creating your Freakout account:
${verifyLink}

This link expires in 24 hours.

If you did not create this account, you can ignore this email.`,
  });
}

export async function sendEmailChangeVerification(input: {
  email: string;
  currentEmail: string;
  name: string | null;
  token: string;
}) {
  const { FROM_ADDRESS, getAppUrl, resend } = await import("@/lib/email");
  const verifyUrl = new URL("/verify-email", getAppUrl());
  verifyUrl.searchParams.set("mode", "email-change");
  verifyUrl.searchParams.set("email", input.email);
  verifyUrl.searchParams.set("token", input.token);

  const greeting = input.name ? `Hi ${input.name},` : "Hi,";
  const htmlGreeting = escapeHtml(greeting);
  const htmlEmail = escapeHtml(input.email);
  const htmlCurrentEmail = escapeHtml(input.currentEmail);
  const verifyLink = verifyUrl.toString();

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: input.email,
    subject: "Confirm your Freakout email change",
    html: `
      <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p>${htmlGreeting}</p>
        <p>Confirm that you want to change your Freakout sign-in email from ${htmlCurrentEmail} to ${htmlEmail}.</p>
        <p>
          <a href="${verifyLink}" style="display: inline-block; border-radius: 8px; background: #111827; color: #ffffff; padding: 10px 14px; text-decoration: none;">
            Confirm email change
          </a>
        </p>
        <p>This link expires in 24 hours.</p>
        <p>If you did not request this change, you can ignore this email.</p>
      </div>
    `,
    text: `${greeting}

Confirm that you want to change your Freakout sign-in email from ${input.currentEmail} to ${input.email}:
${verifyLink}

This link expires in 24 hours.

If you did not request this change, you can ignore this email.`,
  });
}

export async function verifyEmailToken(input: {
  email: string;
  token: string;
  inviteToken?: string | null;
}): Promise<EmailVerificationResult> {
  const hashedToken = hashToken(input.token);
  const verificationToken = await db.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier: input.email,
        token: hashedToken,
      },
    },
  });

  if (!verificationToken) {
    return { status: "invalid" };
  }

  if (verificationToken.expires < new Date()) {
    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: input.email,
          token: hashedToken,
        },
      },
    });
    return { status: "expired" };
  }

  const user = await db.user.findUnique({
    where: { email: input.email },
    select: { id: true, emailVerified: true },
  });
  if (!user) {
    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: input.email,
          token: hashedToken,
        },
      },
    });
    return { status: "invalid" };
  }

  if (!user.emailVerified) {
    await db.user.update({
      where: { email: input.email },
      data: { emailVerified: new Date() },
    });
  }

  await db.verificationToken.delete({
    where: {
      identifier_token: {
        identifier: input.email,
        token: hashedToken,
      },
    },
  });

  if (input.inviteToken) {
    const { InvitationModel } = await import("@/lib/models/InvitationModel");
    await InvitationModel.accept(input.inviteToken, user.id).catch(() => {
      // Best-effort: email verification should succeed even if an invite was revoked.
    });
  }

  return { status: "success" };
}

export async function verifyEmailChangeToken(input: {
  email: string;
  token: string;
}): Promise<EmailVerificationResult> {
  const hashedToken = hashToken(input.token);
  const verificationToken = await db.verificationToken.findFirst({
    where: {
      token: hashedToken,
      identifier: { startsWith: EMAIL_CHANGE_IDENTIFIER_PREFIX },
    },
  });

  if (!verificationToken) {
    return { status: "invalid" };
  }

  const parsedIdentifier = parseEmailChangeIdentifier(verificationToken.identifier);
  if (!parsedIdentifier || parsedIdentifier.email !== input.email) {
    return { status: "invalid" };
  }

  const where = {
    identifier_token: {
      identifier: verificationToken.identifier,
      token: hashedToken,
    },
  };

  if (verificationToken.expires < new Date()) {
    await db.verificationToken.delete({ where });
    return { status: "expired" };
  }

  const [user, existingEmailOwner] = await Promise.all([
    db.user.findUnique({
      where: { id: parsedIdentifier.userId },
      select: { id: true },
    }),
    db.user.findUnique({
      where: { email: parsedIdentifier.email },
      select: { id: true },
    }),
  ]);

  if (
    !user ||
    (existingEmailOwner && existingEmailOwner.id !== parsedIdentifier.userId)
  ) {
    await db.verificationToken.delete({ where });
    return { status: "invalid" };
  }

  await db.user.update({
    where: { id: parsedIdentifier.userId },
    data: {
      email: parsedIdentifier.email,
      emailVerified: new Date(),
    },
  });
  await db.verificationToken.delete({ where });

  return { status: "success" };
}
