"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LuKeyRound } from "react-icons/lu";
import { resetPasswordWithTokenState } from "@/lib/actions/auth";
import type { AppLabels } from "@/labels/types";

type ResetPasswordLabels = AppLabels["auth"]["resetPassword"];

type ResetPasswordFormProps = {
  labels: ResetPasswordLabels;
  userId: string;
  token: string;
};

export function ResetPasswordForm({
  labels,
  userId,
  token,
}: ResetPasswordFormProps) {
  const [state, formAction, pending] = useActionState(
    resetPasswordWithTokenState,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="token" value={token} />

      {state?.error && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.success && (
        <div className="space-y-3">
          <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            {state.success}
          </p>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {labels.signInCta}
          </Link>
        </div>
      )}

      {!state?.success && (
        <>
          <label className="block text-sm">
            <span className="mb-1 block text-sm font-medium text-foreground">
              {labels.newPasswordLabel}
            </span>
            <input
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-divider bg-content1 px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-sm font-medium text-foreground">
              {labels.confirmPasswordLabel}
            </span>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-divider bg-content1 px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <LuKeyRound className="size-4" aria-hidden="true" />
            {pending ? labels.pendingCta : labels.submitCta}
          </button>
        </>
      )}
    </form>
  );
}
