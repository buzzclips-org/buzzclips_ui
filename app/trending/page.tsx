import { Metadata } from "next";
import Link from "next/link";
import { fetchTrendingVideos, fetchVideos } from "@/utility/requests";
import { VideoDTO } from "@/types/video";
import VideoCard from "@/components/video/VideoCard";
import { Flame, TrendingUp, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SITE_URL, generateBreadcrumbSchema, serializeJsonLd } from "@/utility/seo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Trending Videos & Viral Clips | BuzzClips",
  description:
    "Discover what's trending now on BuzzClips. Watch the most popular, viral, and engaging video clips from top creators worldwide.",
  alternates: {
    canonical: `${SITE_URL}/trending`,
  },
  openGraph: {
    title: "Trending Videos & Viral Clips | BuzzClips",
    description: "The hottest trending videos, tech clips, gaming highlights, and music right now.",
    url: `${SITE_URL}/trending`,
  },
};

export default async function TrendingPage() {
  let trendingVideos: VideoDTO[] = [];

  try {
    const res = await fetchTrendingVideos(0, 24);
    trendingVideos = res.content || [];
  } catch {
    try {
      const fallback = await fetchVideos(0);
      trendingVideos = fallback.content || [];
    } catch {
      trendingVideos = [];
    }
  }

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: SITE_URL },
    { name: "Trending Videos", url: `${SITE_URL}/trending` },
  ]);

  return (
    <>
      <script
        id="trending-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(breadcrumbSchema),
        }}
      />
      <div className="w-full flex justify-center py-6 sm:py-10 px-4">
        <div className="w-full lg:max-w-[85%] sm:max-w-full space-y-8">
        {/* Navigation & Header */}
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Explore
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-purple-500/10 border border-border/50 backdrop-blur-md relative overflow-hidden">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/15 text-red-500 border border-red-500/30">
                <Flame className="w-4 h-4 fill-red-500" />
                Live Trending Feed
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Trending on BuzzClips
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The most popular clips, gaming highlights, tech deep-dives, and viral moments climbing the charts right now.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-4 rounded-2xl bg-card/80 border border-border/40 text-center shadow-xs">
                <span className="text-2xl font-black text-red-500 block">
                  {trendingVideos.length}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  Top Clips
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        {trendingVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {trendingVideos.map((video, idx) => (
              <VideoCard
                key={video.videoId}
                video={video}
                rank={idx + 1}
              />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center space-y-4 border-dashed border-border/60">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">
                No trending videos yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Videos will appear here as views, likes, and engagement pick up across BuzzClips.
              </p>
            </div>
            <Link href="/" className="inline-block pt-2">
              <Badge variant="outline" className="cursor-pointer py-1.5 px-3">
                Explore All Videos
              </Badge>
            </Link>
          </Card>
        )}
      </div>
    </div>
    </>
  );
}
