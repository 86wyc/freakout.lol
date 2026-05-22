import { redirect } from "next/navigation";
import { AdminFrame } from "./AdminFrame";
import { auth } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/authz/platform-admin";
import { getLabelsForLocale } from "@/labels";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin");
  }
  if (!isPlatformAdmin(session.user.systemRole)) {
    redirect("/dashboard");
  }

  const { labels } = getLabelsForLocale(session.user.locale ?? "en");

  return (
    <AdminFrame labels={labels.app.admin}>{children}</AdminFrame>
  );
}
