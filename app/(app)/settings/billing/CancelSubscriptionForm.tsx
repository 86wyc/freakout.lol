"use client";

import { cancelSubscriptionAtPeriodEnd } from "@/lib/actions/billing";

type CancelSubscriptionFormProps = {
  cta: string;
  confirmMessage: string;
};

export function CancelSubscriptionForm({
  cta,
  confirmMessage,
}: CancelSubscriptionFormProps) {
  return (
    <form
      action={async () => {
        await cancelSubscriptionAtPeriodEnd();
      }}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-danger/30 px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
      >
        {cta}
      </button>
    </form>
  );
}
