import type { Metadata } from "next";
import EditorLoader from "@/components/editor/EditorLoader";
import EditorSeoContent from "@/components/editor/EditorSeoContent";
import EditorHeading from "@/components/editor/EditorHeading";
import {
  SITE_URL,
  generateHreflangAlternates,
  generateVideoEditorSchema,
  generateVideoEditorHowToSchema,
  generateVideoEditorFaqSchema,
  serializeJsonLd,
} from "@/utility/seo";
import { VIDEO_EDITOR_SEO_KEYWORDS } from "@/constants/seoKeywords";

const PAGE_TITLE =
  "Free Online Video Editor - No Watermark, No Signup | BuzzClips";
const PAGE_DESCRIPTION =
  "Free online video editor that runs in your browser. Trim, cut, merge, crop and rotate videos, add text and music, and export MP4 up to 1080p. No watermark, no signup, files never leave your device.";
const SOCIAL_TITLE = "Free Online Video Editor - Edit Videos in Your Browser";
const SOCIAL_DESCRIPTION =
  "Trim, cut, merge, add text and music, and make videos for YouTube, Reels, Shorts and TikTok. Free, no watermark, no upload - it all runs in your browser.";

export const metadata: Metadata = {
  // `absolute` bypasses the root layout's "%s | BuzzClips (Buzz Clips)" template
  title: { absolute: PAGE_TITLE },
  description: PAGE_DESCRIPTION,
  keywords: [...VIDEO_EDITOR_SEO_KEYWORDS],
  category: "video editing",
  alternates: {
    canonical: SITE_URL,
    languages: generateHreflangAlternates(SITE_URL),
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "BuzzClips",
    title: SOCIAL_TITLE,
    description: SOCIAL_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "BuzzClips - Free Online Video Editor in your browser",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SOCIAL_TITLE,
    description: SOCIAL_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function HomePage() {
  const editorSchema = generateVideoEditorSchema(SITE_URL);
  const howToSchema = generateVideoEditorHowToSchema(SITE_URL);
  const faqSchema = generateVideoEditorFaqSchema();

  return (
    <>
      <script
        id="editor-webapp-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(editorSchema) }}
      />
      <script
        id="editor-howto-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(howToSchema) }}
      />
      <script
        id="editor-faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqSchema) }}
      />

      <div style={{ "--editor-offset": "40px" } as React.CSSProperties}>
        <EditorHeading
          title="Free Online Video Editor"
          tagline="Trim, cut, merge, add text & music. No watermark, no signup, and your files never leave your device."
        />
        <EditorLoader />
      </div>
      <EditorSeoContent />
    </>
  );
}
