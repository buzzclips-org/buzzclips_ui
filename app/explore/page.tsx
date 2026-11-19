import { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { fetchVideos } from "@/utility/requests";
import {
  SITE_URL,
  generateFaqPageSchema,
  generateHreflangAlternates,
  serializeJsonLd,
} from "@/utility/seo";
import { PaginatedVideoResponse, VideoDTO } from "@/types/video";
import ExploreClient from "@/components/explore/ExploreClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Zap, ShieldCheck, Video, HelpCircle } from "lucide-react";

import { POPULAR_SEO_TOPICS } from "@/constants/seoKeywords";

export const revalidate = 60; // Incremental Static Regeneration every 60s

export const metadata: Metadata = {
  title: "BuzzClips (Buzz Clips) - Free Video Streaming Website, Indian Live TV & Creator Reels",
  description:
    "Watch free video streaming, Indian TV live, trending viral clips, gaming highlights, tech tutorials, and reels on BuzzClips (Buzz Clips). Fast buffer-free adaptive HLS playback with zero lag.",
  keywords: [
    "video streaming website",
    "free video streaming",
    "buzzclips",
    "buzz clips",
    "buzzclip",
    "buzz clip",
    "buzzclips tv",
    "buzz clips tv",
    "buzzclip tv",
    "buzz clip tv",
    "buzzclips app",
    "buzz clips app",
    "buzzclip app",
    "indian tv",
    "free indian tv",
    "watch indian tv online free",
    "buzzclips live tv",
    "buzz clips live tv",
    "live indian tv",
    "web series free online",
    "short films streaming",
    "video podcasts free",
    "dd sports live streaming",
    "dd national live stream",
    "dd news live streaming",
    "viral video clips",
    "watch reels online free",
    "buzzclips reels",
    "buzz clips reels",
    "free ott platform",
    "buffer free video streaming",
    "hindi live tv",
    "free live tv india",
  ],
  alternates: {
    canonical: `${SITE_URL}/explore`,
    languages: generateHreflangAlternates(`${SITE_URL}/explore`),
  },
  openGraph: {
    title: "BuzzClips - Free Video Streaming Website & Indian Live TV",
    description:
      "Watch free video streaming, Indian TV live, creator clips, and viral shorts on BuzzClips with adaptive HLS video playback.",
    url: `${SITE_URL}/explore`,
    type: "website",
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "BuzzClips - Free Video Streaming & Indian Live TV Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BuzzClips - Free Video Streaming & Indian Live TV",
    description:
      "Watch free video streaming, Indian TV live, and viral creator clips on BuzzClips.",
    images: [`${SITE_URL}/opengraph-image`],
  },
};

function ExploreSkeleton() {
  return (
    <div className="w-full max-w-full overflow-x-hidden flex justify-center py-6">
      <div className="w-full max-w-full lg:max-w-[85%] px-4 space-y-6 min-w-0">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-11 w-full max-w-md rounded-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="w-full aspect-video rounded-xl" />
              <div className="flex gap-3">
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="w-full h-4" />
                  <Skeleton className="w-2/3 h-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const FAQS = [
  {
    q: "What is BuzzClips (Buzz Clips)?",
    a: "BuzzClips (also known as Buzz Clips or Buzz Clip) is a next-generation free video streaming website and creator clip platform that delivers lightning-fast, buffer-free video playback powered by adaptive HLS technology. Viewers can watch trending viral clips, gaming highlights, tech tutorials, and entertainment videos, alongside 12+ official Free-To-Air Indian Live TV channels.",
  },
  {
    q: "Can I watch free Indian live TV on BuzzClips?",
    a: "Yes! BuzzClips features BuzzClips TV (https://buzzclips.app/tv), offering 12+ official Free-To-Air Indian TV channels including DD National, DD Sports (live cricket, hockey, and athletic tournaments), DD News, Sansad TV Lok Sabha, and Sansad TV Rajya Sabha in full HD with zero lag.",
  },
  {
    q: "Is BuzzClips completely free to watch and use?",
    a: "Yes! BuzzClips is 100% free to explore, stream, and share videos. Anyone can watch high-definition videos with adaptive bitrate streaming without any subscription fee.",
  },
  {
    q: "What makes BuzzClips one of the best free video streaming websites?",
    a: "BuzzClips combines high-speed adaptive bitrate HLS streaming, multi-rendition resolution switching, interactive comments, creator uploads, viral shorts & reels, and official live Indian TV broadcasts in one fast, modern, and completely free web platform.",
  },
  {
    q: "How does BuzzClips provide buffer-free video streaming?",
    a: "BuzzClips utilizes automated HTTP Live Streaming (HLS) transcoding and adaptive bitrate switching. The player dynamically adjusts resolution in real-time according to your network bandwidth, ensuring instant playback on mobile and desktop devices.",
  },
  {
    q: "How do I upload and share video clips on BuzzClips?",
    a: "Simply create a free BuzzClips account or sign in, navigate to the Upload Video section, select your MP4 or WebM video file, and add your title, category, and tags. BuzzClips automatically processes and optimizes your video for immediate worldwide streaming.",
  },
  {
    q: "Can I edit my videos on BuzzClips before sharing them?",
    a: "Yes. BuzzClips includes a free online video editor at https://buzzclips.app that runs entirely in your browser. Trim, cut, merge, add text and music, and export an MP4 with no watermark and no signup, or publish the finished video straight to BuzzClips when you are signed in.",
  },
  {
    q: "What categories of video content are available on BuzzClips?",
    a: "BuzzClips offers an expansive range of categories including Free Indian TV, Tech & Coding, Gaming, Education & Tutorials, Entertainment & Comedy, Music & Beats, News, Sports & Fitness, and Lifestyle vlogs.",
  },
];

const TRENDING_TAGS = [
  "indian-tv",
  "free-tv",
  "dd-sports",
  "buzzclips",
  "tech",
  "coding",
  "gaming",
  "entertainment",
  "music",
  "viral",
  "tutorials",
  "highlights",
  "lifestyle",
];

export default async function ExplorePage() {
  let initialPage: PaginatedVideoResponse | null = null;
  let initialVideos: VideoDTO[] = [];

  try {
    initialPage = await fetchVideos(0);
    initialVideos = (initialPage?.content || []).filter(
      (v: VideoDTO) =>
        (v.videoStatus === "COMPLETED" || !v.videoStatus) &&
        v.visibility !== "PRIVATE"
    );
  } catch (err) {
    console.error("SSR fetch videos failed for homepage:", err);
  }

  // Schema.org ItemList structured data for search engine carousels
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Trending Videos on BuzzClips",
    itemListElement: initialVideos.map((video, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}/watch/${video.slug || video.videoId}`,
      name: video.video_title,
      description:
        video.description ||
        `Watch ${video.video_title} on BuzzClips. High performance video streaming.`,
      image: video.thumbnail_url || `${SITE_URL}/favicon.ico`,
    })),
  };

  // Mirror the FAQ text that is actually rendered below (Google requires schema to match visible content).
  const faqSchema = generateFaqPageSchema(
    FAQS.map((faq) => ({ question: faq.q, answer: faq.a }))
  );

  return (
    <>
      {initialVideos.length > 0 && (
        <script
          id="home-itemlist-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(itemListSchema),
          }}
        />
      )}

      <script
        id="home-faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(faqSchema),
        }}
      />

      {/* Crawlable noscript list for search engines that do not execute client JS */}
      {initialVideos.length > 0 && (
        <noscript>
          <div className="sr-only">
            <h2>Trending Videos on BuzzClips</h2>
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

      {/* Main Explore Video Feed */}
      <Suspense fallback={<ExploreSkeleton />}>
        <ExploreClient
          initialVideos={initialVideos}
          initialPage={initialPage}
        />
      </Suspense>

      {/* SEO & Discoverability Hub Section */}
      <section className="w-full max-w-full overflow-x-hidden flex justify-center py-12 border-t border-border/40 bg-card/20">
        <div className="w-full max-w-full lg:max-w-[85%] px-4 space-y-12 min-w-0">
          {/* Trending Topics & Tags */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Trending on BuzzClips
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {TRENDING_TAGS.map((tag) => (
                <Link
                  key={tag}
                  href={`/tag/${tag}`}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-card hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border/60 transition-all duration-200"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </div>

          {/* Popular Free Indian TV & Video Streaming Directory */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Free Indian TV & Video Streaming Directory
                </h2>
              </div>
              <Link
                href="/tv"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>Live Channel Guide ➔</span>
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEO_TOPICS.map((item) => (
                <Link
                  key={item.name}
                  href={item.url}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-card/80 hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border/50 transition-all"
                >
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/15 text-primary font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Platform Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xs space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Zero-Lag Adaptive HLS
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automated transcoding with multi-bitrate resolution switching ensures fast, instantaneous video playback on every device.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xs space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Built for Video Creators
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Effortless video uploads, custom tagging, thumbnail selection, and real-time community engagement with like/dislike metrics.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xs space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Safe & Free Community
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enjoy unlimited video streaming completely free with strong community guidelines, copyright safety, and cross-device sync.
              </p>
            </div>
          </div>

          {/* Frequently Asked Questions (FAQ) with Schema Integration */}
          <div className="space-y-6 pt-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Frequently Asked Questions about BuzzClips
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Learn more about how BuzzClips delivers high-performance video streaming and creator tools.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FAQS.map((faq, index) => (
                <details
                  key={index}
                  className="group rounded-2xl border border-border/50 bg-card/50 p-4 transition-all duration-200 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-foreground">
                    <span>{faq.q}</span>
                    <span className="shrink-0 ml-2 text-primary transition duration-300 group-open:-rotate-180">
                      ▼
                    </span>
                  </summary>
                  <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
