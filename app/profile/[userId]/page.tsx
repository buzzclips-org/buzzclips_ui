import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPublicUser, getPublicUserVideos } from "@/utility/requests";
import { SITE_URL, generateProfilePageSchema, serializeJsonLd } from "@/utility/seo";
import VideoCard from "@/components/video/VideoCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Film,
  Eye,
  Sparkles,
  ArrowLeft,
  User,
  Video as VideoIcon,
} from "lucide-react";
import { VideoDTO } from "@/types/video";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const user = await getPublicUser(userId);

  if (!user) {
    return {
      title: "Creator Profile | BuzzClips",
      description: "View creator profile and videos on BuzzClips.",
    };
  }

  const name = user.fullName || user.user_name || "Creator";
  const title = `${name} - Videos & Channel | BuzzClips`;
  const description = `Watch videos created by ${name} on BuzzClips. Fast adaptive streaming and video discovery.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/profile/${userId}`,
    },
    openGraph: {
      type: "profile",
      title,
      description,
      url: `${SITE_URL}/profile/${userId}`,
      images: user.avatar_url ? [{ url: user.avatar_url, alt: name }] : [],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: user.avatar_url ? [user.avatar_url] : [],
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const user = await getPublicUser(userId);
  if (user?.username) {
    redirect(`/channel/@${encodeURIComponent(user.username)}`);
  }

  const videosResponse = user ? await getPublicUserVideos(userId, 0, 24) : null;

  if (!user) {
    return (
      <div className="w-full flex justify-center py-16 px-4">
        <Card className="max-w-md w-full border border-border/50 bg-card/85 backdrop-blur-md rounded-2xl text-center p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto border border-border/50">
            <User className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Creator Not Found
            </h1>
            <p className="text-sm text-muted-foreground">
              The creator profile you are looking for does not exist or may have
              been removed.
            </p>
          </div>
          <Link href="/" className="block pt-2">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Explore
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

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

  const canonicalUrl = `${SITE_URL}/profile/${userId}`;
  const profileSchema = generateProfilePageSchema(user, canonicalUrl);

  return (
    <>
      <script
        id="profile-schema-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(profileSchema),
        }}
      />
      <div className="w-full flex justify-center py-6">
        <div className="w-full lg:max-w-[85%] sm:max-w-full px-4 space-y-8">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Explore
          </Link>
        </div>

        {/* Creator Channel Header Banner */}
        <Card className="border border-border/50 shadow-xl dark:shadow-2xl dark:shadow-primary/5 bg-card/85 backdrop-blur-md rounded-2xl overflow-hidden relative">
          <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Creator Avatar */}
              {(() => {
                const displayName = user.fullName || user.user_name || "Creator";
                const handle = user.username
                  ? `@${user.username}`
                  : user.user_name
                  ? `@${user.user_name}`
                  : "";

                return (
                  <>
                    <Avatar className="h-24 w-24 sm:h-28 sm:w-28 ring-4 ring-primary/20 shadow-xl shrink-0">
                      <AvatarImage src={user.avatar_url || ""} alt={displayName} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold text-2xl">
                        {displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Creator Details */}
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
                            Creator
                          </Badge>
                        </div>
                        {handle && (
                          <p className="text-sm font-mono text-muted-foreground">
                            {handle}
                          </p>
                        )}
                      </div>

                      {/* Stats Counters */}
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 border border-border/40 text-foreground font-semibold">
                          <VideoIcon className="w-3.5 h-3.5 text-primary" />
                          <span>{videos.length} Videos</span>
                        </div>

                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 border border-border/40 text-foreground font-semibold">
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                          <span>{formattedTotalViews} Total Views</span>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Creator's Uploaded Videos Section */}
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
                  {user.user_name} hasn&apos;t uploaded any public videos yet. Check
                  back later!
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
