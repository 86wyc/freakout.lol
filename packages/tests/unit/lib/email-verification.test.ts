import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDb } from "../../mocks/db";

const mockResendSend = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "email-1" }));

vi.mock("@/lib/email", () => ({
  FROM_ADDRESS: "test@example.com",
  getAppUrl: vi.fn().mockReturnValue("https://app.example.com"),
  resend: { emails: { send: mockResendSend } },
}));

const {
  createEmailChangeVerificationToken,
  createEmailVerificationToken,
  sendEmailChangeVerification,
  sendEmailVerification,
  verifyEmailChangeToken,
  verifyEmailToken,
} = await import("@/lib/email-verification");

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

describe("email verification helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores only a hashed verification token", async () => {
    const token = await createEmailVerificationToken("test@example.com");

    expect(token).toEqual(expect.any(String));
    expect(mockDb.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: "test@example.com" },
    });
    expect(mockDb.verificationToken.create).toHaveBeenCalledWith({
      data: {
        identifier: "test@example.com",
        token: hashToken(token),
        expires: expect.any(Date),
      },
    });
  });

  it("stores only a hashed email-change token", async () => {
    const token = await createEmailChangeVerificationToken({
      userId: "user-1",
      email: "new@example.com",
    });

    expect(token).toEqual(expect.any(String));
    expect(mockDb.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: "email-change:user-1:new@example.com" },
    });
    expect(mockDb.verificationToken.create).toHaveBeenCalledWith({
      data: {
        identifier: "email-change:user-1:new@example.com",
        token: hashToken(token),
        expires: expect.any(Date),
      },
    });
  });

  it("sends a verification link with email, token, and invite parameters", async () => {
    await sendEmailVerification({
      email: "test@example.com",
      name: "Test User",
      token: "raw-token",
      inviteToken: "invite-token",
    });

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "test@example.com",
        to: "test@example.com",
        subject: "Verify your Freakout email",
        text: expect.stringContaining(
          "https://app.example.com/verify-email?email=test%40example.com&token=raw-token&invite=invite-token"
        ),
      })
    );
  });

  it("sends an email-change verification link", async () => {
    await sendEmailChangeVerification({
      email: "new@example.com",
      currentEmail: "current@example.com",
      name: "Test User",
      token: "raw-token",
    });

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "test@example.com",
        to: "new@example.com",
        subject: "Confirm your Freakout email change",
        text: expect.stringContaining(
          "https://app.example.com/verify-email?mode=email-change&email=new%40example.com&token=raw-token"
        ),
      })
    );
  });

  it("verifies a valid token and deletes it", async () => {
    mockDb.verificationToken.findUnique.mockResolvedValue({
      identifier: "test@example.com",
      token: hashToken("raw-token"),
      expires: new Date(Date.now() + 60_000),
    });
    mockDb.user.findUnique.mockResolvedValue({
      id: "user-1",
      emailVerified: null,
    });

    const result = await verifyEmailToken({
      email: "test@example.com",
      token: "raw-token",
    });

    expect(result).toEqual({ status: "success" });
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
      data: { emailVerified: expect.any(Date) },
    });
    expect(mockDb.verificationToken.delete).toHaveBeenCalledWith({
      where: {
        identifier_token: {
          identifier: "test@example.com",
          token: hashToken("raw-token"),
        },
      },
    });
  });

  it("verifies an email-change token and updates the user email", async () => {
    mockDb.verificationToken.findFirst.mockResolvedValue({
      identifier: "email-change:user-1:new@example.com",
      token: hashToken("raw-token"),
      expires: new Date(Date.now() + 60_000),
    });
    mockDb.user.findUnique
      .mockResolvedValueOnce({ id: "user-1" })
      .mockResolvedValueOnce(null);

    const result = await verifyEmailChangeToken({
      email: "new@example.com",
      token: "raw-token",
    });

    expect(result).toEqual({ status: "success" });
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        email: "new@example.com",
        emailVerified: expect.any(Date),
      },
    });
    expect(mockDb.verificationToken.delete).toHaveBeenCalledWith({
      where: {
        identifier_token: {
          identifier: "email-change:user-1:new@example.com",
          token: hashToken("raw-token"),
        },
      },
    });
  });

  it("returns expired and deletes expired tokens", async () => {
    mockDb.verificationToken.findUnique.mockResolvedValue({
      identifier: "test@example.com",
      token: hashToken("raw-token"),
      expires: new Date(Date.now() - 60_000),
    });

    const result = await verifyEmailToken({
      email: "test@example.com",
      token: "raw-token",
    });

    expect(result).toEqual({ status: "expired" });
    expect(mockDb.user.update).not.toHaveBeenCalled();
    expect(mockDb.verificationToken.delete).toHaveBeenCalled();
  });
});
