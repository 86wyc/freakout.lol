"use client";

import { LuLock, LuSparkles } from "react-icons/lu";
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
};

export function PaywallOverlay({ labels }: Props) {
  return (
    <div className="w-full">
      <div>
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
