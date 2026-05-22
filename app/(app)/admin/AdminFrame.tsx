"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import type { AppLabels } from "@/labels/types";

type AdminLabels = AppLabels["app"]["admin"];

export function AdminFrame({
  children,
  labels,
}: {
  children: React.ReactNode;
  labels: AdminLabels;
}) {
  const pathname = usePathname();
  const isGraphWorkspace = /^\/admin\/graphs\/[^/]+$/.test(pathname);

  if (isGraphWorkspace) {
    return (
      <div className="-m-4 h-[calc(100%+2rem)] w-[calc(100%+2rem)] min-w-0 overflow-hidden sm:-m-6 sm:h-[calc(100%+3rem)] sm:w-[calc(100%+3rem)]">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col gap-6 md:flex-row">
      <AdminSidebar labels={labels} />
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  );
}
