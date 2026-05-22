import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLabelsForLocale } from "@/labels";
import { ProjectModel } from "@/lib/models/ProjectModel";
import { DiligenceJobModel } from "@/lib/models/DiligenceJobModel";
import { InsightsView } from "./InsightsView";
import { checkSubscriptionAccess } from "@/lib/authz/subscription-gate";
import { PaywallOverlay, PaywallFindingTeaser } from "@/components/PaywallOverlay";

export const metadata = {
  title: "Insights | KG Qualify",
};

type InsightsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InsightsPage({ params }: InsightsPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    const { id } = await params;
    redirect(`/login?callbackUrl=/project/${id}/insights`);
  }

  const { id } = await params;
  const project = await ProjectModel.findByIdForUser({
    projectId: id,
    userId: session.user.id,
  });

  if (!project) {
    notFound();
  }

  const { labels } = getLabelsForLocale(session.user.locale ?? "en");

  // Check subscription access
  const access = await checkSubscriptionAccess(session.user.systemRole);
  if (!access.hasAccess) {
    // Load minimal data for teaser (high-risk findings only)
    const data = await DiligenceJobModel.getFullInsightsForProject({
      projectId: project.id,
      userId: session.user.id,
    });

    const highRiskFindings = (data?.findings ?? [])
      .filter((f) => {
        const meta = f.metadata as Record<string, unknown> | null;
        return f.type === "RISK" && meta && (meta.severity === "high" || meta.severity === "critical");
      })
      .map((f) => ({ type: f.type, title: f.title, summary: f.summary }));

    return (
      <div className="mx-auto w-full min-w-0 max-w-3xl space-y-6 overflow-x-hidden">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {labels.app.insights.heading}
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            {project.name} — {labels.app.insights.description}
          </p>
        </div>
        <PaywallOverlay
          labels={labels.app.paywall}
          teaserContent={
            highRiskFindings.length > 0 ? (
              <PaywallFindingTeaser findings={highRiskFindings} />
            ) : undefined
          }
        />
      </div>
    );
  }

  const data = await DiligenceJobModel.getFullInsightsForProject({
    projectId: project.id,
    userId: session.user.id,
  });

  return (
    <InsightsView
      projectName={project.name}
      labels={labels.app.insights}
      data={data}
    />
  );
}
