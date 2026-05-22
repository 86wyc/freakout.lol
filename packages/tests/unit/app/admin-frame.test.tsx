import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminFrame } from "@/app/(app)/admin/AdminFrame";
import { appLabels } from "@/labels/en/app";

const mockPathname = vi.fn().mockReturnValue("/admin/users");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

describe("AdminFrame", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders admin navigation for standard admin pages", () => {
    mockPathname.mockReturnValue("/admin/users");

    render(
      <AdminFrame labels={appLabels.admin}>
        <p>admin content</p>
      </AdminFrame>
    );

    expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Graph Studio" })).toBeInTheDocument();
    expect(screen.getByText("admin content")).toBeInTheDocument();
  });

  it("uses a full-bleed workspace without admin navigation for graph details", () => {
    mockPathname.mockReturnValue("/admin/graphs/graph-1");

    const { container } = render(
      <AdminFrame labels={appLabels.admin}>
        <p>graph workspace</p>
      </AdminFrame>
    );

    expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument();
    expect(screen.getByText("graph workspace")).toBeInTheDocument();
    expect(container.firstElementChild?.className).toContain("-m-4");
  });
});
