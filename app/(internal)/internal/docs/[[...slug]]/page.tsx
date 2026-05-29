import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DocsShell } from "@/components/docs/DocsShell";
import { auth } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/authz/platform-admin";
import { getLabelsForLocale } from "@/labels";
import { getAllDocs, getDocBySlug } from "@/lib/docs";

const INTERNAL_DOCS_ROOT = "/internal/docs";

type InternalDocsPageProps = {
  params: Promise<{ slug?: string[] }>;
};

function getCallbackUrl(slug: string[]): string {
  return slug.length > 0
    ? `${INTERNAL_DOCS_ROOT}/${slug.join("/")}`
    : INTERNAL_DOCS_ROOT;
}

async function requireInternalDocsAdmin(slug: string[]) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${getCallbackUrl(slug)}`);
  }
  if (!isPlatformAdmin(session.user.systemRole)) {
    redirect("/dashboard");
  }

  return session;
}

export async function generateMetadata({
  params,
}: InternalDocsPageProps): Promise<Metadata> {
  const { slug = [] } = await params;
  const { labels } = getLabelsForLocale("en");
  const docsLabels = labels.internalDocs;
  const session = await auth();

  if (
    slug.length === 0 ||
    !session?.user?.id ||
    !isPlatformAdmin(session.user.systemRole)
  ) {
    return {
      title: docsLabels.heading,
      description: docsLabels.description,
    };
  }

  const doc = await getDocBySlug(slug, INTERNAL_DOCS_ROOT);
  if (!doc) {
    return {
      title: docsLabels.heading,
      description: docsLabels.description,
    };
  }

  return {
    title: `${doc.title} | ${docsLabels.heading}`,
    description: doc.summary || docsLabels.description,
  };
}

export default async function InternalDocsPage({ params }: InternalDocsPageProps) {
  const { slug = [] } = await params;
  const session = await requireInternalDocsAdmin(slug);
  const { labels } = getLabelsForLocale(session.user.locale ?? "en");
  const docs = await getAllDocs(INTERNAL_DOCS_ROOT);

  if (docs.length === 0) {
    notFound();
  }

  const currentDoc =
    slug.length === 0 ? null : await getDocBySlug(slug, INTERNAL_DOCS_ROOT);
  if (slug.length > 0 && !currentDoc) {
    notFound();
  }

  return (
    <DocsShell
      currentDoc={currentDoc}
      docs={docs}
      labels={labels.internalDocs}
      rootHref={INTERNAL_DOCS_ROOT}
    />
  );
}
