"use client";

import { LuLock, LuSparkles, LuTriangleAlert } from "react-icons/lu";
import { createSeatCheckoutSession } from "@/lib/actions/billing";

type PaywallLabels = {
  heading: string;
  description: string;
  upgradeCta: string;
  priceNote: string;
  features: string[];
};

type Props = {
  labels: PaywallLabels;
  /** Optional teaser content shown behind the blur (e.g. high-risk warnings) */
  teaserContent?: React.ReactNode;
};

export function PaywallOverlay({ labels, teaserContent }: Props) {
  return (
    <div className="relative w-full">
      {/* Blurred teaser content behind the overlay */}
      {teaserContent && (
        <div
          className="pointer-events-none select-none blur-sm opacity-60"
          aria-hidden="true"
        >
          {teaserContent}
        </div>
      )}

      {/* Overlay card */}
      <div
        className={`${teaserContent ? "absolute inset-0 flex items-center justify-center" : ""}`}
      >
        <div className="mx-auto w-full max-w-md rounded-xl border border-divider bg-background p-6 shadow-lg">
          <div className="flex flex-col items-center text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <LuLock className="size-6 text-primary" aria-hidden="true" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-foreground">
              {labels.heading}
            </h2>
            <p className="mt-2 text-sm text-foreground/70">
              {labels.description}
            </p>

            {/* Feature list */}
            <ul className="mt-4 space-y-2 text-left text-sm text-foreground/80">
              {labels.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <LuSparkles
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <form action={createSeatCheckoutSession} className="mt-6 w-full">
              <button
                type="submit"
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {labels.upgradeCta}
              </button>
            </form>

            <p className="mt-3 text-xs text-foreground/50">
              {labels.priceNote}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * A teaser card for high-risk findings shown to free users.
 * Shows the finding title and type but blurs the summary.
 */
export function PaywallFindingTeaser({
  findings,
}: {
  findings: Array<{ type: string; title: string; summary: string }>;
}) {
  if (findings.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <LuTriangleAlert className="size-4 text-danger" aria-hidden="true" />
        High-risk findings detected
      </h3>
      <div className="grid gap-3 md:grid-cols-2">
        {findings.slice(0, 4).map((finding, i) => (
          <div
            key={i}
            className="rounded-lg border border-danger/20 bg-danger/5 p-4"
          >
            <span className="text-xs font-medium uppercase text-danger">
              {finding.type}
            </span>
            <h4 className="mt-1 text-sm font-semibold text-foreground">
              {finding.title}
            </h4>
            <p className="mt-1 text-sm text-foreground/40 blur-[3px] select-none">
              {finding.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
