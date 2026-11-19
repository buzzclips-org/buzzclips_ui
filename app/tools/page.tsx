import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wrench } from "lucide-react";
import { EDITOR_TOOLS } from "@/constants/editorTools";
import {
  SITE_URL,
  generateBreadcrumbSchema,
  generateHreflangAlternates,
  serializeJsonLd,
} from "@/utility/seo";

const URL_ = `${SITE_URL}/tools`;
const DESCRIPTION =
  "Free online video tools that run in your browser: trim, cut, merge, crop, resize, rotate, add text or music, change speed and make Reels, Shorts and TikToks. No watermark.";

export const metadata: Metadata = {
  title: "Free Online Video Tools - No Watermark",
  description: DESCRIPTION,
  alternates: { canonical: URL_, languages: generateHreflangAlternates(URL_) },
  openGraph: { type: "website", url: URL_, title: "Free Online Video Tools | BuzzClips", description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: "Free Online Video Tools | BuzzClips", description: DESCRIPTION },
};

export default function ToolsIndexPage() {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Free online video tools",
    itemListElement: EDITOR_TOOLS.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/tools/${t.slug}`,
      name: t.name,
    })),
  };
  const breadcrumb = generateBreadcrumbSchema([
    { name: "Video Editor", url: SITE_URL },
    { name: "Video Tools", url: URL_ },
  ]);

  return (
    <div className="w-full max-w-full overflow-x-hidden flex justify-center py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
      <div className="w-full max-w-full min-w-0 space-y-8 px-4 lg:max-w-[85%]">
        <header className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Wrench className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Video tools</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Free online video tools</h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Every tool below opens the same free BuzzClips editor, set up for that job. It all runs in your browser, so
            your videos stay on your device, and exports are MP4 files with no watermark and no signup.
          </p>
        </header>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {EDITOR_TOOLS.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/tools/${t.slug}`}
                className="group flex h-full flex-col gap-2 rounded-2xl border border-border/50 bg-card/40 p-5 transition-colors hover:border-primary/50"
              >
                <h2 className="flex items-center justify-between text-base font-semibold">
                  {t.name}
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </h2>
                <p className="text-xs leading-relaxed text-muted-foreground">{t.tagline}</p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Need several of these at once?{" "}
          <Link href="/" className="font-medium text-primary hover:underline">
            Open the full online video editor
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
