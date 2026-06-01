import type { AppLabels } from "@/labels/types";
import { appLabels } from "@/labels/en/app";
import { marketingLabels } from "@/labels/en/marketing";

export const enLabels: AppLabels = {
  marketing: marketingLabels,
  docs: {
    heading: "Documentation",
    description:
      "Architecture, database structure, delivery notes, and production planning for Freakout.",
    sidebarEyebrow: "Repo Docs",
    indexEyebrow: "Overview",
    indexHeading: "Project documentation",
    indexDescription:
      "Browse the markdown files from the repository docs folder in a public, navigable docs view.",
    allDocsCta: "All docs",
    sourceLabel: "Source file",
    noSummaryFallback: "Open this document to review the full content.",
  },
  internalDocs: {
    heading: "Internal documentation",
    description:
      "Admin-only architecture, database, delivery, and operations documentation.",
    sidebarEyebrow: "Internal Docs",
    indexEyebrow: "Admin",
    indexHeading: "Internal documentation",
    indexDescription:
      "Browse protected markdown documentation for platform administrators.",
    allDocsCta: "All internal docs",
    sourceLabel: "Source file",
    noSummaryFallback: "Open this document to review the full content.",
  },
  auth: {
    verifyEmail: {
      successHeading: "Email verified",
      successDescription:
        "Your email address is verified. You can now sign in to your account.",
      emailChangeSuccessHeading: "Email change confirmed",
      emailChangeSuccessDescription:
        "Your sign-in email has been updated. Use the new address the next time you sign in.",
      expiredHeading: "Verification link expired",
      expiredDescription:
        "This verification link is no longer valid. Register again to receive a fresh link.",
      invalidHeading: "Verification link unavailable",
      invalidDescription:
        "This verification link is invalid or has already been used.",
      missingHeading: "Verification link missing",
      missingDescription:
        "Open the verification link from your email to finish creating your account.",
      signInCta: "Sign in",
      settingsCta: "Back to settings",
      registerCta: "Create account",
    },
    resetPassword: {
      heading: "Reset password",
      description: "Choose a new password for this account.",
      newPasswordLabel: "New password",
      confirmPasswordLabel: "Confirm new password",
      submitCta: "Reset password",
      pendingCta: "Resetting...",
      signInCta: "Sign in",
      missingHeading: "Reset link missing",
      missingDescription:
        "Open the password reset link from your email to choose a new password.",
      invalidHeading: "Reset link unavailable",
      invalidDescription:
        "This password reset link is invalid or has already been used.",
      expiredHeading: "Reset link expired",
      expiredDescription:
        "This password reset link is no longer valid. Ask an administrator for a new one.",
    },
  },
  app: appLabels,
};
