import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockVerifyEmailToken = vi.hoisted(() => vi.fn());
const mockVerifyEmailChangeToken = vi.hoisted(() => vi.fn());

vi.mock("@/lib/email-verification", () => ({
  verifyEmailChangeToken: mockVerifyEmailChangeToken,
  verifyEmailToken: mockVerifyEmailToken,
}));

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders success state after verifying a token", async () => {
    mockVerifyEmailToken.mockResolvedValue({ status: "success" });
    const { default: VerifyEmailPage } = await import(
      "@/app/(auth)/verify-email/page"
    );

    render(
      await VerifyEmailPage({
        searchParams: Promise.resolve({
          email: "TEST@example.com",
          token: "raw-token",
          invite: "invite-token",
        }),
      })
    );

    expect(mockVerifyEmailToken).toHaveBeenCalledWith({
      email: "test@example.com",
      token: "raw-token",
      inviteToken: "invite-token",
    });
    expect(screen.getByRole("heading", { name: "Email verified" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("renders success state after verifying an email-change token", async () => {
    mockVerifyEmailChangeToken.mockResolvedValue({ status: "success" });
    const { default: VerifyEmailPage } = await import(
      "@/app/(auth)/verify-email/page"
    );

    render(
      await VerifyEmailPage({
        searchParams: Promise.resolve({
          mode: "email-change",
          email: "NEW@example.com",
          token: "raw-token",
        }),
      })
    );

    expect(mockVerifyEmailChangeToken).toHaveBeenCalledWith({
      email: "new@example.com",
      token: "raw-token",
    });
    expect(mockVerifyEmailToken).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Email change confirmed" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to settings" })).toHaveAttribute(
      "href",
      "/settings/account"
    );
  });

  it("renders missing-link state without calling verification", async () => {
    const { default: VerifyEmailPage } = await import(
      "@/app/(auth)/verify-email/page"
    );

    render(await VerifyEmailPage({ searchParams: Promise.resolve({}) }));

    expect(mockVerifyEmailToken).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Verification link missing" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/register"
    );
  });
});
