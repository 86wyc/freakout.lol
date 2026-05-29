import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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

vi.mock("@/components/Header", () => ({
  Header: ({ user }: { user?: unknown }) => (
    <div data-testid="header" data-user={user ? "yes" : "no"} />
  ),
}));

vi.mock("@/components/Footer", () => ({
  Footer: () => <div data-testid="footer" />,
}));

vi.mock("@/components/MermaidDiagram", () => ({
  MermaidDiagram: ({ chart }: { chart: string }) => (
    <pre data-testid="mermaid-diagram">{chart}</pre>
  ),
}));

describe("Internal docs route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users from the internal layout", async () => {
    mockAuth.mockResolvedValue(null);
    const { default: InternalLayout } = await import("@/app/(internal)/layout");

    await expect(
      InternalLayout({ children: <p>internal content</p> })
    ).rejects.toThrow("REDIRECT:/login?callbackUrl=/internal/docs");
  });

  it("redirects non-admin users from the internal layout", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", locale: "en", systemRole: "USER" },
    });
    const { default: InternalLayout } = await import("@/app/(internal)/layout");

    await expect(
      InternalLayout({ children: <p>internal content</p> })
    ).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("renders the protected layout for platform admins", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-1",
        locale: "en",
        systemRole: "ADMIN",
        name: "Admin User",
        email: "admin@example.com",
        image: null,
      },
    });
    const { default: InternalLayout } = await import("@/app/(internal)/layout");

    render(await InternalLayout({ children: <p>internal content</p> }));

    expect(screen.getByTestId("header")).toHaveAttribute("data-user", "yes");
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByText("internal content")).toBeInTheDocument();
  });

  it("renders docs links under the internal docs base path", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", locale: "en", systemRole: "ADMIN" },
    });
    const { default: InternalDocsPage } = await import(
      "@/app/(internal)/internal/docs/[[...slug]]/page"
    );

    render(await InternalDocsPage({ params: Promise.resolve({}) }));

    expect(screen.getAllByText("Internal documentation").length).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("link", { name: /ARCHITECTURE/i })
        .some((link) => link.getAttribute("href") === "/internal/docs/architecture")
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /DATABASE/i })
        .some((link) => link.getAttribute("href") === "/internal/docs/database")
    ).toBe(true);
  });

  it("keeps detail-page navigation inside internal docs", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", locale: "en", systemRole: "ADMIN" },
    });
    const { default: InternalDocsPage } = await import(
      "@/app/(internal)/internal/docs/[[...slug]]/page"
    );

    render(
      await InternalDocsPage({
        params: Promise.resolve({ slug: ["architecture"] }),
      })
    );

    expect(screen.getByRole("link", { name: "All internal docs" })).toHaveAttribute(
      "href",
      "/internal/docs"
    );
    expect(screen.getByText(/Source file: ARCHITECTURE\.md/)).toBeInTheDocument();
  });

  it("preserves the requested docs path in unauthenticated redirects", async () => {
    mockAuth.mockResolvedValue(null);
    const { default: InternalDocsPage } = await import(
      "@/app/(internal)/internal/docs/[[...slug]]/page"
    );

    await expect(
      InternalDocsPage({
        params: Promise.resolve({ slug: ["architecture"] }),
      })
    ).rejects.toThrow("REDIRECT:/login?callbackUrl=/internal/docs/architecture");
  });
});
