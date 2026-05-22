import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { mockDb } from "../../mocks/db";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockRedirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
const mockNotFound = vi.fn(() => {
  throw new Error("NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
  notFound: mockNotFound,
}));

describe("Admin users pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", locale: "en", systemRole: "ADMIN" },
    });
  });

  it("renders the user table with inspect links", async () => {
    mockDb.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        email: "user@example.com",
        name: "User One",
        systemRole: "USER",
        createdAt: new Date("2026-05-20T12:00:00.000Z"),
      },
    ]);

    const { default: AdminUsersPage } = await import(
      "@/app/(app)/admin/users/page"
    );
    render(await AdminUsersPage());

    expect(
      screen.getByRole("heading", { name: "User Management" })
    ).toBeInTheDocument();
    expect(screen.getByText("User One")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Inspect/i })).toHaveAttribute(
      "href",
      "/admin/users/user-1"
    );
  });

  it("renders user detail metadata and activity counts", async () => {
    mockDb.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User One",
      locale: "en",
      systemRole: "USER",
      emailVerified: null,
      createdAt: new Date("2026-05-20T12:00:00.000Z"),
      updatedAt: new Date("2026-05-21T12:00:00.000Z"),
      _count: {
        apiKeys: 2,
        diligenceJobs: 3,
        firmMemberships: 1,
        projects: 4,
      },
    });

    const { default: AdminUserDetailPage } = await import(
      "@/app/(app)/admin/users/[id]/page"
    );
    render(
      await AdminUserDetailPage({
        params: Promise.resolve({ id: "user-1" }),
      })
    );

    expect(screen.getByRole("heading", { name: "User One" })).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByText("User ID")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Users/i })).toHaveAttribute(
      "href",
      "/admin/users"
    );
  });

  it("returns not found for a missing user detail", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);

    const { default: AdminUserDetailPage } = await import(
      "@/app/(app)/admin/users/[id]/page"
    );

    await expect(
      AdminUserDetailPage({ params: Promise.resolve({ id: "missing" }) })
    ).rejects.toThrow("NOT_FOUND");
  });
});
