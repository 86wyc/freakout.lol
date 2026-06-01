"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  clearPasswordResetToken,
  createPasswordResetToken,
  sendPasswordResetEmail,
} from "@/lib/password-reset";
import { isValidEmail, normalizeEmail } from "@/lib/utils/email";
import { revalidatePath } from "next/cache";

type SystemRoleValue = "ADMIN" | "USER";
type AdminActionResult = {
  error?: string;
  success?: string;
};

const SYSTEM_ROLES = new Set<SystemRoleValue>(["ADMIN", "USER"]);
const EMAIL_VERIFICATION_VALUES = new Set(["verified", "unverified"]);
const UNAUTHORIZED_MESSAGE = "Unauthorized";

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function requireAdminSession(): Promise<
  { id: string; systemRole: string | undefined } | null
> {
  const session = await auth();
  if (session?.user?.systemRole !== "ADMIN") {
    return null;
  }

  return {
    id: session.user.id,
    systemRole: session.user.systemRole,
  };
}

function revalidateAdminUser(userId: string) {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function updateUserSystemRole(
  userId: string,
  role: SystemRoleValue
): Promise<{ error?: string }> {
  const session = await requireAdminSession();

  if (!session) {
    return { error: UNAUTHORIZED_MESSAGE };
  }

  if (session.id === userId) {
    return { error: "You cannot change your own system role." };
  }

  await db.user.update({
    where: { id: userId },
    data: { systemRole: role },
  });

  revalidateAdminUser(userId);
  return {};
}

export async function updateAdminUserWithState(
  _previousState: AdminActionResult | undefined,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdminSession();
  if (!session) {
    return { error: UNAUTHORIZED_MESSAGE };
  }

  const userId = getFormString(formData, "userId").trim();
  const email = normalizeEmail(getFormString(formData, "email"));
  const systemRole = getFormString(formData, "systemRole") as SystemRoleValue;
  const emailVerification = getFormString(formData, "emailVerification");

  if (!userId || !email || !isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }

  if (!SYSTEM_ROLES.has(systemRole)) {
    return { error: "Select a valid system role." };
  }

  if (!EMAIL_VERIFICATION_VALUES.has(emailVerification)) {
    return { error: "Select a valid email verification state." };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      systemRole: true,
    },
  });

  if (!user) {
    return { error: "User not found." };
  }

  if (session.id === userId && systemRole !== user.systemRole) {
    return { error: "You cannot change your own system role." };
  }

  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser && existingUser.id !== userId) {
    return { error: "An account with this email already exists." };
  }

  await db.user.update({
    where: { id: userId },
    data: {
      email,
      systemRole,
      emailVerified:
        emailVerification === "verified"
          ? user.emailVerified ?? new Date()
          : null,
    },
  });

  revalidateAdminUser(userId);
  return { success: "User updated." };
}

export async function triggerAdminPasswordResetWithState(
  _previousState: AdminActionResult | undefined,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdminSession();
  if (!session) {
    return { error: UNAUTHORIZED_MESSAGE };
  }

  const userId = getFormString(formData, "userId").trim();
  if (!userId) {
    return { error: "User not found." };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (!user) {
    return { error: "User not found." };
  }

  const token = await createPasswordResetToken(user.id);
  try {
    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      userId: user.id,
      token,
    });
  } catch {
    await clearPasswordResetToken(user.id).catch(() => undefined);
    return { error: "Password reset email could not be sent." };
  }

  return { success: "Password reset email sent." };
}
