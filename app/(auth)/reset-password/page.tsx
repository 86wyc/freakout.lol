import Link from "next/link";
import { LuKeyRound, LuTriangleAlert } from "react-icons/lu";
import { getLabelsForLocale } from "@/labels";
import { getPasswordResetTokenStatus } from "@/lib/password-reset";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = {
  title: "Reset Password | Freakout.lol",
};

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    id?: string;
    token?: string;
  }>;
};

type ResetPasswordView = {
  heading: string;
  description: string;
};

function getUnavailableView(
  status: "missing" | "invalid" | "expired",
  labels: ReturnType<typeof getLabelsForLocale>["labels"]["auth"]["resetPassword"]
): ResetPasswordView {
  if (status === "expired") {
    return {
      heading: labels.expiredHeading,
      description: labels.expiredDescription,
    };
  }

  if (status === "missing") {
    return {
      heading: labels.missingHeading,
      description: labels.missingDescription,
    };
  }

  return {
    heading: labels.invalidHeading,
    description: labels.invalidDescription,
  };
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const userId = params?.id?.trim() ?? "";
  const token = params?.token?.trim() ?? "";
  const { labels } = getLabelsForLocale("en");
  const t = labels.auth.resetPassword;

  const tokenStatus =
    userId && token
      ? await getPasswordResetTokenStatus({ userId, token })
      : "missing";

  if (tokenStatus !== "valid") {
    const view = getUnavailableView(tokenStatus, t);

    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/15">
              <LuTriangleAlert className="size-7 text-danger" aria-hidden="true" />
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
            href="/login"
            className="inline-block w-full rounded-md border border-divider px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-content2"
          >
            {t.signInCta}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
              <LuKeyRound className="size-7 text-primary" aria-hidden="true" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            {t.heading}
          </h1>
          <p className="mt-2 text-sm text-foreground/60">{t.description}</p>
        </div>
        <ResetPasswordForm labels={t} userId={userId} token={token} />
      </div>
    </div>
  );
}
