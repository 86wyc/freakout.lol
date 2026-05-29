import Link from "next/link";
import { LuCircleCheck, LuTriangleAlert } from "react-icons/lu";
import { getLabelsForLocale } from "@/labels";
import {
  verifyEmailChangeToken,
  verifyEmailToken,
  type EmailVerificationResult,
} from "@/lib/email-verification";

export const metadata = {
  title: "Verify Email | Freakout.lol",
};

type VerifyEmailPageProps = {
  searchParams?: Promise<{
    email?: string;
    token?: string;
    invite?: string;
    mode?: string;
  }>;
};

type VerifyEmailView = {
  tone: "success" | "danger";
  heading: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
};

function normalizeEmail(input: string | undefined): string {
  return input?.trim().toLowerCase() ?? "";
}

function getViewForResult(
  result: EmailVerificationResult | { status: "missing" },
  labels: ReturnType<typeof getLabelsForLocale>["labels"]["auth"]["verifyEmail"],
  mode: "registration" | "email-change"
): VerifyEmailView {
  if (result.status === "success") {
    return {
      tone: "success",
      heading:
        mode === "email-change"
          ? labels.emailChangeSuccessHeading
          : labels.successHeading,
      description:
        mode === "email-change"
          ? labels.emailChangeSuccessDescription
          : labels.successDescription,
      ctaHref: mode === "email-change" ? "/settings/account" : "/login",
      ctaLabel: mode === "email-change" ? labels.settingsCta : labels.signInCta,
    };
  }

  if (result.status === "expired") {
    return {
      tone: "danger",
      heading: labels.expiredHeading,
      description: labels.expiredDescription,
      ctaHref: "/register",
      ctaLabel: labels.registerCta,
    };
  }

  if (result.status === "missing") {
    return {
      tone: "danger",
      heading: labels.missingHeading,
      description: labels.missingDescription,
      ctaHref: "/register",
      ctaLabel: labels.registerCta,
    };
  }

  return {
    tone: "danger",
    heading: labels.invalidHeading,
    description: labels.invalidDescription,
    ctaHref: "/register",
    ctaLabel: labels.registerCta,
  };
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const email = normalizeEmail(params?.email);
  const token = params?.token?.trim() ?? "";
  const inviteToken = params?.invite?.trim() || null;
  const mode =
    params?.mode === "email-change" ? "email-change" : "registration";
  const { labels } = getLabelsForLocale("en");
  const t = labels.auth.verifyEmail;

  const result =
    email && token
      ? mode === "email-change"
        ? await verifyEmailChangeToken({ email, token })
        : await verifyEmailToken({ email, token, inviteToken })
      : ({ status: "missing" } as const);
  const view = getViewForResult(result, t, mode);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex justify-center">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full ${
              view.tone === "success" ? "bg-success/15" : "bg-danger/15"
            }`}
          >
            {view.tone === "success" ? (
              <LuCircleCheck className="size-7 text-success" aria-hidden="true" />
            ) : (
              <LuTriangleAlert className="size-7 text-danger" aria-hidden="true" />
            )}
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {view.heading}
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            {view.description}
          </p>
        </div>
        <Link
          href={view.ctaHref}
          className={`inline-block w-full rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 ${
            view.tone === "success"
              ? "bg-primary text-primary-foreground"
              : "border border-divider text-foreground hover:bg-content2"
          }`}
        >
          {view.ctaLabel}
        </Link>
      </div>
    </div>
  );
}
