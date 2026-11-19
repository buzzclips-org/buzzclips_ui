import { Metadata } from "next";
import { fetchTrendingVideos, fetchVideos } from "@/utility/requests";
import { VideoDTO } from "@/types/video";
import { ReelsContainer } from "@/components/reels/ReelsContainer";
import { SITE_URL, generateBreadcrumbSchema, serializeJsonLd } from "@/utility/seo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "BuzzClips Reels - Trending Short Videos & Viral Clips | Built in India",
  description:
    "Watch trending short video reels, creator viral clips, and mobile entertainment on BuzzClips. Swipe up for instant buffer-free HLS playback.",
  keywords: [
    "buzzclips reels",
    "buzz clips reels",
    "buzzclip reels",
    "buzz clip reels",
    "buzz clip reel",
    "buzzclips shorts",
    "buzz clips shorts",
    "buzzclip shorts",
    "buzz clips",
    "buzzclip",
    "trending video shorts",
    "viral video clips",
    "reels online free",
    "short videos india",
    "creator reels",
    "watch reels web",
    "Made in India reels",
    "shorts streaming",
  ],
  alternates: {
    canonical: `${SITE_URL}/reels`,
  },
  openGraph: {
    title: "BuzzClips Reels - Trending Short Videos & Viral Clips",
    description:
      "Watch trending reels and creator clips on BuzzClips with instant swipe playback.",
    url: `${SITE_URL}/reels`,
    type: "website",
    siteName: "BuzzClips",
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "BuzzClips Reels",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BuzzClips Reels - Trending Short Videos & Viral Clips",
    description: "Watch trending reels and creator clips with instant playback.",
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default async function ReelsPage() {
  let reelsVideos: VideoDTO[] = [];

  try {
    const res = await fetchTrendingVideos(0, 20);
    reelsVideos = res.content || [];
  } catch {
    try {
      const fallback = await fetchVideos(0);
      reelsVideos = fallback.content || [];
    } catch {
      reelsVideos = [];
    }
  }

  // Filter completed and playable videos
  const playableReels = reelsVideos.filter(
    (v) =>
      Boolean(v.m3u8Url) &&
      (v.videoStatus === "COMPLETED" || !v.videoStatus) &&
      v.visibility !== "PRIVATE"
  );

  const breadcrumbsSchema = generateBreadcrumbSchema([
    { name: "Home", url: SITE_URL },
    { name: "Reels & Shorts", url: `${SITE_URL}/reels` },
  ]);

  return (
    <>
      <script
        id="reels-breadcrumbs-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(breadcrumbsSchema),
        }}
      />
      <ReelsContainer initialVideos={playableReels.length > 0 ? playableReels : reelsVideos} />
    </>
  );
}
