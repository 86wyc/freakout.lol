import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";
import { withSentryConfig } from "@sentry/nextjs";

const isDevelopment = process.env.NODE_ENV !== "production";
const LOCAL_WORKFLOW_DEFAULT_PORT = "3000";

function getLocalDevPort(): string {
  const inlinePortArg = process.argv.find(
    (arg) => arg.startsWith("--port=") || arg.startsWith("-p=")
  );
  if (inlinePortArg) {
    return inlinePortArg.split("=")[1] || LOCAL_WORKFLOW_DEFAULT_PORT;
  }

  const portFlagIndex = process.argv.findIndex(
    (arg) => arg === "--port" || arg === "-p"
  );
  if (portFlagIndex >= 0) {
    return process.argv[portFlagIndex + 1] || LOCAL_WORKFLOW_DEFAULT_PORT;
  }

  return process.env.PORT || LOCAL_WORKFLOW_DEFAULT_PORT;
}

function configureLocalWorkflowBaseUrl(): void {
  if (
    !isDevelopment ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.WORKFLOW_LOCAL_BASE_URL
  ) {
    return;
  }

  const lifecycle = process.env.npm_lifecycle_event;
  const isHttpScript = lifecycle === "dev:http";
  const isHttpsScript =
    lifecycle === "dev" ||
    lifecycle === "dev:https" ||
    lifecycle === "dev:turbo" ||
    process.argv.includes("--experimental-https");
  const protocol = isHttpsScript && !isHttpScript ? "https" : "http";

  process.env.WORKFLOW_LOCAL_BASE_URL = `${protocol}://localhost:${getLocalDevPort()}`;
}

configureLocalWorkflowBaseUrl();

const contentSecurityPolicyDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
];
if (!isDevelopment) {
  contentSecurityPolicyDirectives.push("upgrade-insecure-requests");
}
const contentSecurityPolicy = contentSecurityPolicyDirectives.join("; ").trim();

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: [
    "workflow",
    "@workflow/core",
    "@workflow/world-vercel",
    "@workflow/world-local",
    "@vercel/queue",
  ],
  experimental: {
    optimizePackageImports: [
      "react-icons",
      "motion/react",
      "@heroui/react",
    ],
  },
  async headers() {
    const baseHeaders = [
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];

    if (!isDevelopment) {
      baseHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/:path*",
        headers: baseHeaders,
      },
    ];
  },
};

export default withSentryConfig(withWorkflow(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "freak-holdings-ltd",

  project: "kgq",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
