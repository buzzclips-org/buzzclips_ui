import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EditorLoader from "@/components/editor/EditorLoader";
import EditorHeading from "@/components/editor/EditorHeading";
import ToolSeoContent from "@/components/editor/ToolSeoContent";
import { EDITOR_TOOLS, getEditorTool } from "@/constants/editorTools";
import {
  SITE_URL,
  generateBreadcrumbSchema,
  generateFaqPageSchema,
  generateHreflangAlternates,
  serializeJsonLd,
} from "@/utility/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return EDITOR_TOOLS.map((t) => ({ slug: t.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tool = getEditorTool(slug);
  if (!tool) return {};
  const url = `${SITE_URL}/tools/${tool.slug}`;
  return {
    title: tool.title,
    description: tool.description,
    keywords: tool.keywords,
    alternates: { canonical: url, languages: generateHreflangAlternates(url) },
    openGraph: {
      type: "website",
      url,
      siteName: "BuzzClips",
      title: `${tool.h1} | BuzzClips`,
      description: tool.description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${tool.h1} | BuzzClips`,
      description: tool.description,
    },
  };
}

export default async function ToolPage({ params }: Props) {
  const { slug } = await params;
  const tool = getEditorTool(slug);
  if (!tool) notFound();

  const url = `${SITE_URL}/tools/${tool.slug}`;
  const related = tool.related.map(getEditorTool).filter((t): t is NonNullable<typeof t> => Boolean(t));

  const appSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `BuzzClips ${tool.name}`,
    url,
    description: tool.description,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any (modern web browser)",
    browserRequirements: "Requires a browser with WebCodecs support (Chrome, Edge, Safari 16.4+, Firefox 130+)",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to ${tool.name.toLowerCase()} online for free`,
    description: tool.description,
    tool: [{ "@type": "HowToTool", name: "BuzzClips online video editor (web browser)" }],
    step: tool.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
      url: `${url}#step-${i + 1}`,
    })),
  };
  const faqSchema = generateFaqPageSchema(tool.faqs);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Video Editor", url: SITE_URL },
    { name: "Video Tools", url: `${SITE_URL}/tools` },
    { name: tool.name, url },
  ]);

  return (
    <>
      {[appSchema, howToSchema, faqSchema, breadcrumbSchema].map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />
      ))}
      <div style={{ "--editor-offset": "40px" } as React.CSSProperties}>
        <EditorHeading
          title={tool.h1}
          tagline={tool.tagline}
          breadcrumb={[
            { name: "Editor", href: "/" },
            { name: "Tools", href: "/tools" },
          ]}
        />
        <EditorLoader preset={{ aspect: tool.preset.aspect, panel: tool.preset.panel, hint: tool.editorHint }} />
      </div>
      <ToolSeoContent tool={tool} related={related} />
    </>
  );
}
