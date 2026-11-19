import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicUser, getPublicUserVideos } from "@/utility/requests";
import { SITE_URL, serializeJsonLd } from "@/utility/seo";
import VideoCard from "@/components/video/VideoCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Film,
  Eye,
  Sparkles,
  ArrowLeft,
  Video as VideoIcon,
  AtSign,
} from "lucide-react";
import { VideoDTO } from "@/types/video";
import { SubscribeButton } from "@/components/channel/SubscribeButton";

export const revalidate = 60;

async function resolveUser(rawHandle: string) {
  const decoded = decodeURIComponent(rawHandle).trim();
  // Try direct identifier first (backend accepts @handle, plain handle, or Firebase UID)
  let user = await getPublicUser(decoded);
  if (!user && decoded.startsWith("@")) {
    user = await getPublicUser(decoded.substring(1));
  } else if (!user && !decoded.startsWith("@")) {
    user = await getPublicUser(`@${decoded}`);
  }
  return user;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const user = await resolveUser(handle);

  if (!user) {
    return {
      title: "Channel Not Found | BuzzClips",
      description: "The requested channel could not be found on BuzzClips.",
    };
  }

  const displayName = user.fullName || user.user_name || "Creator";
  const userHandle = user.username
    ? `@${user.username}`
    : user.user_name
    ? `@${user.user_name}`
    : "";

  const title = `${displayName} (${userHandle}) - Channel & Videos | BuzzClips`;
  const description = `Watch latest videos and high-definition streams by ${displayName} (${userHandle}) on BuzzClips.`;
  const canonicalUrl = `${SITE_URL}/channel/${encodeURIComponent(
    user.username ? `@${user.username}` : handle
  )}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "profile",
      title,
      description,
      url: canonicalUrl,
      images: user.avatar_url
        ? [{ url: user.avatar_url, alt: displayName }]
        : [],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: user.avatar_url ? [user.avatar_url] : [],
    },
  };
}

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const user = await resolveUser(handle);

  if (!user) {
    notFound();
  }

  const displayName = user.fullName || user.user_name || "Creator";
  const userHandle = user.username
    ? `@${user.username}`
    : user.user_name
    ? `@${user.user_name}`
    : "";

  const videosResponse = await getPublicUserVideos(user.userId, 0, 36);

  const videos: VideoDTO[] = (videosResponse?.content || []).filter(
    (v: VideoDTO) =>
      (v.videoStatus === "COMPLETED" || !v.videoStatus) &&
      v.visibility !== "PRIVATE"
  );

  const totalViews = videos.reduce(
    (acc: number, v: VideoDTO) => acc + (v.video_views || 0),
    0
  );
  const formattedTotalViews =
    totalViews > 100000
      ? `${(totalViews / 100000).toFixed(1)}L`
      : totalViews > 1000
      ? `${(totalViews / 1000).toFixed(1)}K`
      : totalViews.toLocaleString();

  const profilePageSchema = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: displayName,
      alternateName: userHandle,
      identifier: user.username || user.userId,
      image: user.avatar_url,
      interactionStatistic: [
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/WatchAction",
          userInteractionCount: totalViews,
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(profilePageSchema) }}
      />

      <div className="w-full flex justify-center py-6">
        <div className="w-full lg:max-w-[85%] sm:max-w-full px-4 space-y-8">
          {/* Back Navigation */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back to Explore
            </Link>
          </div>

          {/* Channel Header Banner */}
          <Card className="border border-border/50 shadow-xl dark:shadow-2xl dark:shadow-primary/5 bg-card/85 backdrop-blur-md rounded-2xl overflow-hidden relative">
            <div className="h-3 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Creator Avatar */}
                <Avatar className="h-24 w-24 sm:h-28 sm:w-28 ring-4 ring-primary/20 shadow-xl shrink-0">
                  <AvatarImage src={user.avatar_url || ""} alt={displayName} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold text-2xl">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Creator Info */}
                <div className="flex-1 text-center sm:text-left space-y-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                        {displayName}
                      </h1>
                      <Badge
                        variant="outline"
                        className="text-xs bg-primary/10 text-primary border-primary/20 gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        {user.user_role || "Creator"}
                      </Badge>
                    </div>

                    {userHandle && (
                      <p className="text-sm font-mono text-muted-foreground flex items-center justify-center sm:justify-start gap-1">
                        <AtSign className="w-3.5 h-3.5 text-muted-foreground/60" />
                        <span>{userHandle.replace(/^@/, "")}</span>
                      </p>
                    )}
                  </div>

                  {/* Channel Stats & Subscribe */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 border border-border/40 text-foreground font-semibold">
                      <VideoIcon className="w-3.5 h-3.5 text-primary" />
                      <span>{videos.length} {videos.length === 1 ? "Video" : "Videos"}</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 border border-border/40 text-foreground font-semibold">
                      <Eye className="w-3.5 h-3.5 text-blue-500" />
                      <span>{formattedTotalViews} Total Views</span>
                    </div>

                    <div className="sm:ml-auto">
                      <SubscribeButton channelId={user.userId} size="sm" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Uploaded Videos Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/30">
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                Uploaded Videos
                <Badge variant="secondary" className="text-xs font-semibold ml-1">
                  {videos.length}
                </Badge>
              </h2>
            </div>

            {videos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {videos.map((video) => (
                  <VideoCard key={video.videoId} video={video} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground/60 flex items-center justify-center mx-auto border border-border/50">
                  <Film className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-foreground text-sm">
                    No public videos yet
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    {displayName} hasn&apos;t uploaded any public videos yet. Check back soon!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
