import {
  LuCircleCheck,
  LuCircleHelp,
  LuCircleX,
  LuEye,
  LuLightbulb,
  LuLock,
  LuShieldCheck,
  LuSparkles,
  LuTriangleAlert,
} from "react-icons/lu";
import Link from "next/link";
import type { AppLabels } from "@/labels/types";
import type { RestrictedDiligenceInsights } from "@/lib/models/DiligenceJobModel";

type InsightsLabels = AppLabels["app"]["insights"];
type PaywallLabels = AppLabels["app"]["paywall"];

type Props = {
  projectName: string;
  labels: InsightsLabels;
  paywallLabels: PaywallLabels;
  data: RestrictedDiligenceInsights | null;
};

const findingTypeIcons = {
  RISK: LuTriangleAlert,
  OPPORTUNITY: LuLightbulb,
  WARNING: LuTriangleAlert,
  OBSERVATION: LuEye,
};

const findingTypeColors: Record<string, string> = {
  RISK: "text-danger",
  OPPORTUNITY: "text-success",
  WARNING: "text-warning",
  OBSERVATION: "text-foreground/60",
};

const claimStatusIcons = {
  SUPPORTED: LuCircleCheck,
  CONTRADICTED: LuCircleX,
  INCONCLUSIVE: LuCircleHelp,
};

const claimStatusColors: Record<string, string> = {
  SUPPORTED: "text-success",
  CONTRADICTED: "text-danger",
  INCONCLUSIVE: "text-warning",
};

export function RestrictedInsightsView({ projectName, labels, paywallLabels, data }: Props) {
  if (!data) {
    return (
      <div className="min-w-0 w-full space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">{labels.heading}</h1>
        <p className="text-foreground/60">{labels.empty}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full space-y-8 overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{labels.heading}</h1>
        <p className="mt-1 break-words text-sm text-foreground/60">
          {projectName} - {labels.description}
        </p>
      </div>

      {data.findings.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <LuTriangleAlert className="size-5" aria-hidden="true" />
            {labels.findingsHeading}
            <span className="text-sm font-normal text-foreground/50">
              ({data.findings.length})
            </span>
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {data.findings.map((finding, index) => {
              const Icon =
                findingTypeIcons[finding.type as keyof typeof findingTypeIcons] ?? LuEye;
              const color = findingTypeColors[finding.type] ?? "text-foreground/60";

              return (
                <div
                  key={`${finding.type}-${index}`}
                  className="rounded-lg border border-divider bg-content1 p-4"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`size-4 ${color}`} aria-hidden="true" />
                    <span className={`text-xs font-medium uppercase ${color}`}>
                      {labels.findingTypes[
                        finding.type as keyof typeof labels.findingTypes
                      ] ?? finding.type}
                    </span>
                  </div>
                  <RestrictedTextSkeleton />
                  {finding.severity && (
                    <p className="mt-3 border-t border-divider/50 pt-2 text-xs">
                      <span className="font-medium text-foreground/60">
                        {labels.severityLabel}:{" "}
                      </span>
                      <SeverityBadge severity={finding.severity} />
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {data.claims.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <LuShieldCheck className="size-5" aria-hidden="true" />
            {labels.claimsHeading}
            <span className="text-sm font-normal text-foreground/50">
              ({data.claims.length})
            </span>
          </h2>
          <div className="mt-3 space-y-2">
            {data.claims.map((claim, index) => {
              const Icon =
                claimStatusIcons[claim.status as keyof typeof claimStatusIcons] ??
                LuCircleHelp;
              const color = claimStatusColors[claim.status] ?? "text-foreground/60";

              return (
                <div
                  key={`${claim.status}-${index}`}
                  className="flex items-start gap-3 rounded-lg border border-divider bg-content1 p-4"
                >
                  <Icon className={`mt-0.5 size-4 shrink-0 ${color}`} aria-hidden="true" />
                  <div className="flex-1">
                    <RestrictedTextSkeleton />
                    <div className="mt-2 flex items-center gap-3 text-xs text-foreground/50">
                      <span className={color}>
                        {labels.claimStatuses[
                          claim.status as keyof typeof labels.claimStatuses
                        ] ?? claim.status}
                      </span>
                      <ConfidenceBadge value={claim.confidence} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Upgrade CTA */}
      <section className="rounded-xl border border-divider bg-content1 p-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <LuLock className="size-6 text-primary" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            {paywallLabels.heading}
          </h2>
          <p className="mt-2 max-w-md text-sm text-foreground/70">
            {paywallLabels.description}
          </p>
          <ul className="mt-4 space-y-2 text-left text-sm text-foreground/80">
            {paywallLabels.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <LuSparkles
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/settings/billing"
            className="mt-6 inline-flex rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {paywallLabels.upgradeCta}
          </Link>
          <p className="mt-3 text-xs text-foreground/50">
            {paywallLabels.priceNote}
          </p>
        </div>
      </section>
    </div>
  );
}

function RestrictedTextSkeleton() {
  return (
    <div aria-hidden="true" className="mt-2 space-y-2">
      <div className="h-3 w-3/4 rounded-full bg-content3" />
      <div className="h-3 w-1/2 rounded-full bg-content3" />
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number | null }) {
  if (value === null) return null;

  const pct = Math.round(value * 100);
  const color =
    pct >= 80 ? "text-success" : pct >= 50 ? "text-warning" : "text-danger";

  return <span className={`text-xs font-medium ${color}`}>{pct}%</span>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-danger/10 text-danger",
    high: "bg-danger/10 text-danger",
    medium: "bg-warning/10 text-warning",
    low: "bg-success/10 text-success",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[severity] ?? "bg-default/10 text-foreground/50"}`}
    >
      {severity}
    </span>
  );
}
