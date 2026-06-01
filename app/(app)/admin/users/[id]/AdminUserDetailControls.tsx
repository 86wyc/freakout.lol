"use client";

import { useActionState } from "react";
import { LuKeyRound, LuMailCheck, LuSave, LuUserCog } from "react-icons/lu";
import {
  triggerAdminPasswordResetWithState,
  updateAdminUserWithState,
} from "@/lib/actions/admin";
import type { AppLabels } from "@/labels/types";

type AdminLabels = AppLabels["app"]["admin"];

type ActionState = {
  error?: string;
  success?: string;
};

type AdminUserDetailControlsProps = {
  labels: AdminLabels;
  user: {
    id: string;
    email: string;
    systemRole: "ADMIN" | "USER";
    emailVerified: boolean;
  };
  isCurrentUser: boolean;
};

function ActionMessage({ state }: { state: ActionState | undefined }) {
  if (state?.error) {
    return (
      <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
        {state.error}
      </p>
    );
  }

  if (state?.success) {
    return (
      <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
        {state.success}
      </p>
    );
  }

  return null;
}

export function AdminUserDetailControls({
  labels,
  user,
  isCurrentUser,
}: AdminUserDetailControlsProps) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateAdminUserWithState,
    undefined
  );
  const [resetState, resetAction, resetPending] = useActionState(
    triggerAdminPasswordResetWithState,
    undefined
  );

  return (
    <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_280px]">
      <form
        action={updateAction}
        className="space-y-4 rounded-lg border border-divider bg-content1 p-4"
      >
        <input type="hidden" name="userId" value={user.id} />
        {isCurrentUser && (
          <input type="hidden" name="systemRole" value={user.systemRole} />
        )}

        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-content2 text-foreground/60">
            <LuUserCog className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {labels.userEditHeading}
            </h2>
          </div>
        </div>

        <ActionMessage state={updateState} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-foreground/55">
              {labels.emailLabel}
            </span>
            <input
              name="email"
              type="email"
              required
              defaultValue={user.email}
              autoComplete="email"
              className="w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground/55">
              <LuUserCog className="size-3.5" aria-hidden="true" />
              {labels.systemRoleLabel}
            </span>
            <select
              name="systemRole"
              defaultValue={user.systemRole}
              disabled={isCurrentUser}
              className="w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:text-foreground/40"
            >
              <option value="USER">{labels.systemRoleUserLabel}</option>
              <option value="ADMIN">{labels.systemRoleAdminLabel}</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground/55">
              <LuMailCheck className="size-3.5" aria-hidden="true" />
              {labels.emailVerificationStateLabel}
            </span>
            <select
              name="emailVerification"
              defaultValue={user.emailVerified ? "verified" : "unverified"}
              className="w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="verified">{labels.emailVerifiedStateLabel}</option>
              <option value="unverified">{labels.emailUnverifiedStateLabel}</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={updatePending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
        >
          <LuSave className="size-4" aria-hidden="true" />
          {updatePending ? labels.userEditPendingCta : labels.userEditCta}
        </button>
      </form>

      <form
        action={resetAction}
        className="space-y-4 rounded-lg border border-divider bg-content1 p-4"
      >
        <input type="hidden" name="userId" value={user.id} />

        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-content2 text-foreground/60">
            <LuKeyRound className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {labels.passwordResetHeading}
            </h2>
          </div>
        </div>

        <ActionMessage state={resetState} />

        <button
          type="submit"
          disabled={resetPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-divider px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-content2 disabled:opacity-60"
        >
          <LuKeyRound className="size-4" aria-hidden="true" />
          {resetPending
            ? labels.passwordResetPendingCta
            : labels.passwordResetCta}
        </button>
      </form>
    </div>
  );
}
