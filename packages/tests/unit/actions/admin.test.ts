import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDb } from "../../mocks/db";

const mockCreatePasswordResetToken = vi.hoisted(() =>
  vi.fn().mockResolvedValue("raw-reset-token")
);
const mockSendPasswordResetEmail = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined)
);
const mockClearPasswordResetToken = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined)
);

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/password-reset", () => ({
  createPasswordResetToken: mockCreatePasswordResetToken,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
  clearPasswordResetToken: mockClearPasswordResetToken,
}));

const {
  triggerAdminPasswordResetWithState,
  updateAdminUserWithState,
  updateUserSystemRole,
} = await import("@/lib/actions/admin");
const { revalidatePath } = await import("next/cache");

function createFormData(data: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value);
  }
  return formData;
}

describe("updateUserSystemRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Property 4: updateUserSystemRole rejects all non-admin callers
  // Validates: Requirements 4.4
  const NON_ADMIN_ROLES = ["USER", undefined, null, ""] as const;

  it.each(NON_ADMIN_ROLES)(
    "returns Unauthorized for caller with systemRole=%s",
    async (role) => {
      mockAuth.mockResolvedValue({ user: { id: "caller-id", systemRole: role } });

      const result = await updateUserSystemRole("target-id", "ADMIN");

      expect(result).toEqual({ error: "Unauthorized" });
      expect(mockDb.user.update).not.toHaveBeenCalled();
    }
  );

  it("returns Unauthorized when session is null (unauthenticated)", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await updateUserSystemRole("target-id", "ADMIN");

    expect(result).toEqual({ error: "Unauthorized" });
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it("returns error when admin tries to change their own role (self-demotion)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-id", systemRole: "ADMIN" },
    });

    const result = await updateUserSystemRole("admin-id", "USER");

    expect(result).toEqual({ error: "You cannot change your own system role." });
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it("updates user role and revalidates path when admin promotes another user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-id", systemRole: "ADMIN" },
    });
    mockDb.user.update.mockResolvedValue({ id: "target-id", systemRole: "ADMIN" });

    const result = await updateUserSystemRole("target-id", "ADMIN");

    expect(result).toEqual({});
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "target-id" },
      data: { systemRole: "ADMIN" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
  });

  it("updates user role and revalidates path when admin demotes another user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-id", systemRole: "ADMIN" },
    });
    mockDb.user.update.mockResolvedValue({ id: "target-id", systemRole: "USER" });

    const result = await updateUserSystemRole("target-id", "USER");

    expect(result).toEqual({});
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "target-id" },
      data: { systemRole: "USER" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
  });
});

describe("updateAdminUserWithState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "admin-id", systemRole: "ADMIN" },
    });
  });

  it("rejects non-admin callers", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-id", systemRole: "USER" } });

    const result = await updateAdminUserWithState(
      undefined,
      createFormData({
        userId: "target-id",
        email: "target@example.com",
        systemRole: "USER",
        emailVerification: "verified",
      })
    );

    expect(result).toEqual({ error: "Unauthorized" });
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it("updates email, role, and email verification state", async () => {
    mockDb.user.findUnique
      .mockResolvedValueOnce({
        id: "target-id",
        email: "old@example.com",
        emailVerified: null,
        systemRole: "USER",
      })
      .mockResolvedValueOnce(null);

    const result = await updateAdminUserWithState(
      undefined,
      createFormData({
        userId: "target-id",
        email: "NEW@example.com",
        systemRole: "ADMIN",
        emailVerification: "verified",
      })
    );

    expect(result).toEqual({ success: "User updated." });
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "target-id" },
      data: {
        email: "new@example.com",
        systemRole: "ADMIN",
        emailVerified: expect.any(Date),
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users/target-id");
  });

  it("rejects duplicate emails owned by another user", async () => {
    mockDb.user.findUnique
      .mockResolvedValueOnce({
        id: "target-id",
        email: "old@example.com",
        emailVerified: new Date("2026-05-20T12:00:00.000Z"),
        systemRole: "USER",
      })
      .mockResolvedValueOnce({ id: "other-id" });

    const result = await updateAdminUserWithState(
      undefined,
      createFormData({
        userId: "target-id",
        email: "taken@example.com",
        systemRole: "USER",
        emailVerification: "unverified",
      })
    );

    expect(result).toEqual({
      error: "An account with this email already exists.",
    });
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it("prevents admins from changing their own role through the detail form", async () => {
    mockDb.user.findUnique.mockResolvedValueOnce({
      id: "admin-id",
      email: "admin@example.com",
      emailVerified: new Date("2026-05-20T12:00:00.000Z"),
      systemRole: "ADMIN",
    });

    const result = await updateAdminUserWithState(
      undefined,
      createFormData({
        userId: "admin-id",
        email: "admin@example.com",
        systemRole: "USER",
        emailVerification: "verified",
      })
    );

    expect(result).toEqual({
      error: "You cannot change your own system role.",
    });
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });
});

describe("triggerAdminPasswordResetWithState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "admin-id", systemRole: "ADMIN" },
    });
  });

  it("sends a password reset email for the selected user", async () => {
    mockDb.user.findUnique.mockResolvedValue({
      id: "target-id",
      email: "target@example.com",
      name: "Target User",
    });

    const result = await triggerAdminPasswordResetWithState(
      undefined,
      createFormData({ userId: "target-id" })
    );

    expect(result).toEqual({ success: "Password reset email sent." });
    expect(mockCreatePasswordResetToken).toHaveBeenCalledWith("target-id");
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith({
      email: "target@example.com",
      name: "Target User",
      userId: "target-id",
      token: "raw-reset-token",
    });
  });

  it("clears the reset token when delivery fails", async () => {
    mockDb.user.findUnique.mockResolvedValue({
      id: "target-id",
      email: "target@example.com",
      name: null,
    });
    mockSendPasswordResetEmail.mockRejectedValueOnce(new Error("mail failed"));

    const result = await triggerAdminPasswordResetWithState(
      undefined,
      createFormData({ userId: "target-id" })
    );

    expect(result).toEqual({
      error: "Password reset email could not be sent.",
    });
    expect(mockClearPasswordResetToken).toHaveBeenCalledWith("target-id");
  });
});
