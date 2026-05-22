import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Sidebar } from "@/components/Sidebar";

vi.mock("@/components/LogoutButton", () => ({
  LogoutButton: () => <button type="button">Sign out</button>,
}));

vi.mock("@/components/ThemeSwitcher", () => ({
  ThemeSwitcher: () => <button type="button">Theme</button>,
}));

vi.mock("@/components/FirmSwitcher", () => ({
  FirmSwitcher: () => <div data-testid="firm-switcher" />,
}));

const mockPathname = vi.fn().mockReturnValue("/dashboard");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

const mockGetProjectForSidebar = vi.fn();
const mockGetRecentProjects = vi.fn().mockResolvedValue([]);
vi.mock("@/lib/actions/sidebar", () => ({
  getProjectForSidebar: (...args: unknown[]) => mockGetProjectForSidebar(...args),
  getRecentProjects: (...args: unknown[]) => mockGetRecentProjects(...args),
}));

describe("Sidebar — default nav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue("/dashboard");
    mockGetRecentProjects.mockResolvedValue([]);
  });

  it("renders Dashboard link", () => {
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
  });

  it("renders Settings link", () => {
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
  });

  it("renders Sign out button", () => {
    render(<Sidebar />);
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});

describe("Sidebar — project nav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue("/dashboard");
  });

  it("renders project sub-nav links when on a project route", async () => {
    mockGetProjectForSidebar.mockResolvedValue({
      id: "p-1",
      name: "Alpha Project",
      hasDraft: false,
      hasInsights: true,
      hasReports: true,
      hasEnquiries: true,
    });
    mockPathname.mockReturnValue("/project/p-1");
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "General" })).toHaveAttribute("href", "/project/p-1");
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Insights" })).toHaveAttribute(
        "href",
        "/project/p-1/insights"
      )
    );
    expect(screen.getByRole("link", { name: "Reports" })).toHaveAttribute(
      "href",
      "/project/p-1/report"
    );
    expect(screen.getByRole("link", { name: "Enquiries" })).toHaveAttribute(
      "href",
      "/project/p-1/enquiries"
    );
  });

  it("hides insights and reports links when the project has no data for them", async () => {
    mockGetProjectForSidebar.mockResolvedValue({
      id: "p-1",
      name: "Alpha Project",
      hasDraft: false,
      hasInsights: false,
      hasReports: false,
      hasEnquiries: false,
    });
    mockPathname.mockReturnValue("/project/p-1");

    render(<Sidebar />);

    await waitFor(() => expect(screen.getByText("Alpha Project")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "Insights" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Reports" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Enquiries" })).not.toBeInTheDocument();
  });

  it("shows the project name once loaded", async () => {
    mockGetProjectForSidebar.mockResolvedValue({
      id: "p-1",
      name: "Alpha Project",
      hasDraft: false,
      hasInsights: true,
      hasReports: true,
      hasEnquiries: true,
    });
    mockPathname.mockReturnValue("/project/p-1");
    render(<Sidebar />);
    await waitFor(() => expect(screen.getByText("Alpha Project")).toBeInTheDocument());
  });

  it("renders a back link to /dashboard", () => {
    mockGetProjectForSidebar.mockResolvedValue({
      id: "p-1",
      name: "Alpha Project",
      hasDraft: false,
      hasInsights: true,
      hasReports: true,
      hasEnquiries: true,
    });
    mockPathname.mockReturnValue("/project/p-1");
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: /Projects/i })).toHaveAttribute("href", "/dashboard");
  });
});

describe("Sidebar admin navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue("/dashboard");
    mockGetRecentProjects.mockResolvedValue([]);
  });

  it("shows the admin link for admin users", async () => {
    render(<Sidebar showAdmin adminLabel="Admin" />);

    await waitFor(() => expect(mockGetRecentProjects).toHaveBeenCalled());
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/admin"
    );
  });

  it("hides the admin link for regular users", () => {
    render(<Sidebar showAdmin={false} adminLabel="Admin" />);

    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("shows the admin link on project routes", async () => {
    mockPathname.mockReturnValue("/project/project-1");
    mockGetProjectForSidebar.mockResolvedValue({
      id: "project-1",
      name: "Alpha Project",
      hasDraft: false,
      hasInsights: false,
      hasReports: false,
      hasEnquiries: false,
    });

    render(<Sidebar showAdmin adminLabel="Admin" />);

    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/admin"
    );
  });
});
