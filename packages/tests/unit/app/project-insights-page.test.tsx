import { describe, expect, it, beforeEach, vi } from "vitest";
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
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>(
    "next/navigation"
  );
  return {
    ...actual,
    redirect: mockRedirect,
    notFound: mockNotFound,
  };
});

const mockFindByIdForUser = vi.fn();
vi.mock("@/lib/models/ProjectModel", () => ({
  ProjectModel: {
    findByIdForUser: mockFindByIdForUser,
  },
}));

const mockGetFullInsightsForProject = vi.fn();
const mockGetRestrictedInsightsForProject = vi.fn();
vi.mock("@/lib/models/DiligenceJobModel", () => ({
  DiligenceJobModel: {
    getFullInsightsForProject: (...args: unknown[]) =>
      mockGetFullInsightsForProject(...args),
    getRestrictedInsightsForProject: (...args: unknown[]) =>
      mockGetRestrictedInsightsForProject(...args),
  },
}));

const mockCheckSubscriptionAccess = vi.fn();
vi.mock("@/lib/authz/subscription-gate", () => ({
  checkSubscriptionAccess: (...args: unknown[]) =>
    mockCheckSubscriptionAccess(...args),
}));

vi.mock("@/app/(app)/project/[id]/insights/InsightsView", () => ({
  InsightsView: () => <div>FullInsightsView</div>,
}));

vi.mock("@/app/(app)/project/[id]/insights/RestrictedInsightsView", () => ({
  RestrictedInsightsView: () => <div>RestrictedInsightsView</div>,
}));

vi.mock("@/labels", () => ({
  getLabelsForLocale: vi.fn(() => ({
    locale: "en",
    labels: {
      app: {
        insights: {},
      },
    },
  })),
}));

const { default: InsightsPage } = await import(
  "@/app/(app)/project/[id]/insights/page"
);

describe("project insights page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "user-1", locale: "en", systemRole: "USER" },
    });
    mockFindByIdForUser.mockResolvedValue({
      id: "project-1",
      name: "Alpha Project",
    });
    mockCheckSubscriptionAccess.mockResolvedValue({ hasAccess: true });
  });

  it("loads full insights only for users with subscription access", async () => {
    mockGetFullInsightsForProject.mockResolvedValue(null);

    const page = await InsightsPage({
      params: Promise.resolve({ id: "project-1" }),
    });

    render(page);
    expect(screen.getByText("FullInsightsView")).toBeInTheDocument();
    expect(mockGetFullInsightsForProject).toHaveBeenCalledOnce();
    expect(mockGetRestrictedInsightsForProject).not.toHaveBeenCalled();
  });

  it("loads only restricted insight metadata when subscription access is denied", async () => {
    mockCheckSubscriptionAccess.mockResolvedValue({
      hasAccess: false,
      firmId: "firm-1",
      plan: "starter",
      billingStatus: "trialing",
    });
    mockGetRestrictedInsightsForProject.mockResolvedValue({
      findings: [{ type: "RISK", severity: "high" }],
      claims: [{ status: "CONTRADICTED", confidence: 0.1 }],
    });

    const page = await InsightsPage({
      params: Promise.resolve({ id: "project-1" }),
    });

    render(page);
    expect(screen.getByText("RestrictedInsightsView")).toBeInTheDocument();
    expect(mockGetRestrictedInsightsForProject).toHaveBeenCalledWith({
      projectId: "project-1",
      userId: "user-1",
    });
    expect(mockGetFullInsightsForProject).not.toHaveBeenCalled();
  });
});
