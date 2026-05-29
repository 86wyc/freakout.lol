"use client";

import { useActionState } from "react";
import { LuKeyRound, LuMail } from "react-icons/lu";
import {
  changePasswordWithState,
  requestEmailChangeWithState,
} from "@/lib/actions/auth";
import type { AppLabels } from "@/labels/types";

type SettingsLabels = AppLabels["app"]["settings"];
type ActionState = {
  error?: string;
  success?: string;
};

type AccountSecurityFormsProps = {
  currentEmail: string;
  labels: SettingsLabels;
  requiresCurrentPassword: boolean;
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

export function AccountSecurityForms({
  currentEmail,
  labels,
  requiresCurrentPassword,
}: AccountSecurityFormsProps) {
  const [emailState, emailAction, emailPending] = useActionState(
    requestEmailChangeWithState,
    undefined
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    changePasswordWithState,
    undefined
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form
        action={emailAction}
        className="space-y-4 rounded-lg border border-divider bg-content1 p-4"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-content2 text-foreground/60">
            <LuMail className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {labels.changeEmailHeading}
            </h3>
            <p className="mt-0.5 text-sm text-foreground/60">
              {labels.changeEmailDescription}
            </p>
          </div>
        </div>

        <ActionMessage state={emailState} />

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-foreground/55">
              {labels.currentEmailLabel}
            </span>
            <input
              type="email"
              value={currentEmail}
              disabled
              className="w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground/60 outline-none"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-foreground/55">
              {labels.newEmailLabel}
            </span>
            <input
              name="newEmail"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          {requiresCurrentPassword && (
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-foreground/55">
                {labels.currentPasswordLabel}
              </span>
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
          )}
        </div>

        <button
          type="submit"
          disabled={emailPending}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {emailPending
            ? labels.requestEmailChangePendingCta
            : labels.requestEmailChangeCta}
        </button>
      </form>

      <form
        action={passwordAction}
        className="space-y-4 rounded-lg border border-divider bg-content1 p-4"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-content2 text-foreground/60">
            <LuKeyRound className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {labels.changePasswordHeading}
            </h3>
            <p className="mt-0.5 text-sm text-foreground/60">
              {labels.changePasswordDescription}
            </p>
          </div>
        </div>

        <ActionMessage state={passwordState} />

        {requiresCurrentPassword ? (
          <>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-foreground/55">
                  {labels.currentPasswordLabel}
                </span>
                <input
                  name="currentPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-foreground/55">
                  {labels.newPasswordLabel}
                </span>
                <input
                  name="newPassword"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-foreground/55">
                  {labels.confirmPasswordLabel}
                </span>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={passwordPending}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {passwordPending
                ? labels.changePasswordPendingCta
                : labels.changePasswordCta}
            </button>
          </>
        ) : (
          <p className="rounded-md bg-content2 px-3 py-2 text-sm text-foreground/60">
            {labels.passwordUnavailableMessage}
          </p>
        )}
      </form>
    </div>
  );
}
