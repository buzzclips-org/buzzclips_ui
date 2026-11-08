import ViewVideo from "@/components/video/ViewVideo";
import { Metadata } from "next";
import { getVideoBySlug } from "@/utility/requests";
import { VideoDTO } from "@/types/video";
import {
  SITE_URL,
  generateVideoJsonLd,
  generateBreadcrumbSchema,
  generateHreflangAlternates,
  serializeJsonLd,
} from "@/utility/seo";

export const revalidate = 60; // Incremental Static Regeneration every 60 seconds

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = SITE_URL;
  const canonicalUrl = `${baseUrl}/watch/${slug}`;

  try {
    const video = await getVideoBySlug(slug);
    if (video) {
      const title = video.seo?.title || video.video_title;
      const description =
        video.seo?.description ||
        video.description ||
        `Watch ${video.video_title} on BuzzClips. Fast adaptive HLS streaming with instant playback.`;
      const thumbnailUrl = video.thumbnail_url || `${baseUrl}/favicon.ico`;

      return {
        title: `${title} | BuzzClips`,
        description,
        alternates: {
          canonical: canonicalUrl,
          languages: generateHreflangAlternates(canonicalUrl),
          types: {
            "application/json+oembed": `${baseUrl}/api/oembed?url=${encodeURIComponent(
              canonicalUrl
            )}&format=json`,
          },
        },
        openGraph: {
          type: "video.other",
          siteName: "BuzzClips",
          title,
          description,
          url: canonicalUrl,
          images: [
            {
              url: thumbnailUrl,
              width: 1280,
              height: 720,
              alt: title,
            },
          ],
          videos: [
            {
              url: `${baseUrl}/embed/${video.slug || video.videoId}`,
              width: 1280,
              height: 720,
            },
            ...(video.m3u8Url
              ? [
                  {
                    url: video.m3u8Url,
                    type: "application/x-mpegURL",
                    width: 1280,
                    height: 720,
                  },
                ]
              : []),
          ],
        },
        twitter: {
          card: "player",
          title,
          description,
          images: [thumbnailUrl],
          players: [
            {
              playerUrl: `${baseUrl}/embed/${video.slug || video.videoId}`,
              streamUrl: video.m3u8Url || `${baseUrl}/embed/${video.slug || video.videoId}`,
              width: 1280,
              height: 720,
            },
          ],
        },
      };
    }
  } catch {
    // Fallback if not reachable or during static analysis
  }

  return {
    title: "Watch Video | BuzzClips",
    alternates: {
      canonical: canonicalUrl,
      languages: generateHreflangAlternates(canonicalUrl),
      types: {
        "application/json+oembed": `${baseUrl}/api/oembed?url=${encodeURIComponent(
          canonicalUrl
        )}&format=json`,
      },
    },
  };
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const baseUrl = SITE_URL;
  let video: VideoDTO | null = null;

  try {
    video = await getVideoBySlug(slug);
  } catch {
    // Handled in ViewVideo
  }

  const watchUrl = `${baseUrl}/watch/${slug}`;
  const title = video?.seo?.title || video?.video_title || "Watch Video";

  // Construct Google-compliant Schema.org VideoObject and Breadcrumbs for SSR
  const jsonLdVideoObject = video
    ? generateVideoJsonLd(video, baseUrl)
    : null;

  const breadcrumbSchema = video
    ? generateBreadcrumbSchema([
        { name: "Home", url: baseUrl },
        {
          name: video.category || "Videos",
          url: `${baseUrl}/?category=${video.category || "ALL"}`,
        },
        { name: title, url: watchUrl },
      ])
    : null;

  return (
    <>
      {jsonLdVideoObject && (
        <script
          id="server-video-schema-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(jsonLdVideoObject),
          }}
        />
      )}
      {breadcrumbSchema && (
        <script
          id="server-breadcrumb-schema-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(breadcrumbSchema),
          }}
        />
      )}
      <ViewVideo slug={slug} initialVideo={video || undefined} />
    </>
  );
}

