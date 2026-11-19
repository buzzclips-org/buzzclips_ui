import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { searchVideos } from "@/utility/requests";
import { SITE_URL, generateBreadcrumbSchema, serializeJsonLd } from "@/utility/seo";
import { VideoDTO } from "@/types/video";
import ExploreClient from "@/components/explore/ExploreClient";
import { Skeleton } from "@/components/ui/skeleton";

export const revalidate = 60;

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const { tag } = await params;
  const cleanTag = decodeURIComponent(tag).trim().replace(/^#/, "");

  if (!cleanTag) {
    return {
      title: "Tag Not Found | BuzzClips",
      description: "Browse video tags on BuzzClips.",
    };
  }

  const title = `#${cleanTag} Videos & Creator Clips | BuzzClips`;
  const description = `Discover and stream trending videos tagged #${cleanTag} on BuzzClips. Watch creator clips with adaptive HLS video streaming.`;
  const canonicalUrl = `${SITE_URL}/tag/${encodeURIComponent(cleanTag)}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      images: [
        {
          url: `${SITE_URL}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `#${cleanTag} videos on BuzzClips`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/opengraph-image`],
    },
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const cleanTag = decodeURIComponent(tag).trim().replace(/^#/, "");

  if (!cleanTag) {
    notFound();
  }

  let initialPage = null;
  let initialVideos: VideoDTO[] = [];

  try {
    initialPage = await searchVideos({
      tag: cleanTag,
      page: 0,
      size: 12,
    });
    initialVideos = (initialPage?.content || []).filter(
      (v: VideoDTO) =>
        (v.videoStatus === "COMPLETED" || !v.videoStatus) &&
        v.visibility !== "PRIVATE"
    );
  } catch (err) {
    console.error(`Failed to fetch tag videos for #${cleanTag}:`, err);
  }

  // Breadcrumbs schema
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: SITE_URL },
    { name: `#${cleanTag}`, url: `${SITE_URL}/tag/${encodeURIComponent(cleanTag)}` },
  ]);

  // ItemList schema
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Videos tagged #${cleanTag} on BuzzClips`,
    itemListElement: initialVideos.map((video, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}/watch/${video.slug || video.videoId}`,
      name: video.video_title,
      description: video.description || `Watch ${video.video_title} on BuzzClips`,
      image: video.thumbnail_url || `${SITE_URL}/favicon.ico`,
    })),
  };

  return (
    <>
      <script
        id="tag-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }}
      />
      {initialVideos.length > 0 && (
        <script
          id="tag-itemlist-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListSchema) }}
        />
      )}

      {/* Crawlable noscript fallback */}
      {initialVideos.length > 0 && (
        <noscript>
          <div className="sr-only">
            <h2>Videos tagged #{cleanTag} on BuzzClips</h2>
            <ul>
              {initialVideos.map((video) => (
                <li key={video.videoId}>
                  <a href={`/watch/${video.slug || video.videoId}`}>
                    {video.video_title}
                  </a>
                  <p>{video.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </noscript>
      )}

      <Suspense
        fallback={
          <div className="w-full max-w-full overflow-x-hidden flex justify-center py-6">
            <div className="w-full max-w-full lg:max-w-[85%] px-4 space-y-6 min-w-0">
              <Skeleton className="h-10 w-48" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="w-full aspect-video rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        }
      >
        <ExploreClient
          initialVideos={initialVideos}
          initialPage={initialPage}
          defaultTag={cleanTag}
        />
      </Suspense>
    </>
  );
}
