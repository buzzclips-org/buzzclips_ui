import { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LiveTvClient } from "@/components/tv/LiveTvClient";
import { ALL_LIVE_CHANNELS } from "@/constants/liveChannels";
import { SEO_KEYWORD_GROUPS } from "@/constants/seoKeywords";
import {
  SITE_URL,
  generateLiveTvSchema,
  generateBreadcrumbSchema,
  generateChannelListSchema,
  generateLiveTvFaqSchema,
  generateHreflangAlternates,
  serializeJsonLd,
} from "@/utility/seo";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio, Tv, Zap, Sparkles, Globe } from "lucide-react";

export const revalidate = 60;

interface LiveTvPageProps {
  searchParams: Promise<{ channel?: string }>;
}

export async function generateMetadata({
  searchParams,
}: LiveTvPageProps): Promise<Metadata> {
  const { channel: channelId } = await searchParams;
  const channel =
    ALL_LIVE_CHANNELS.find((c) => c.id === channelId) ||
    ALL_LIVE_CHANNELS[0];

  const isSpecificChannel = Boolean(channelId);
  const title = isSpecificChannel
    ? `${channel.name} (${channel.country}) Live Stream - BuzzClips TV | Free FTA TV Online`
    : `Free Live TV Worldwide - Watch Indian & Global FTA Channels Online HD | BuzzClips TV`;

  const description = isSpecificChannel
    ? `Watch ${channel.name} (${channel.hindiName || channel.name}) live stream free in HD on BuzzClips TV. Official Free-To-Air broadcast from ${channel.country} featuring ${channel.category.toLowerCase()} with zero buffering and zero login.`
    : `Watch free live TV online in HD on BuzzClips TV. Stream official Free-To-Air (FTA) channels worldwide including Doordarshan (India), Bloomberg, France 24, DW English, Al Jazeera, NHK World Japan, Red Bull TV, and news networks with zero lag.`;

  const canonicalUrl = `${SITE_URL}/tv${isSpecificChannel ? `?channel=${channel.id}` : ""}`;

  return {
    title,
    description,
    keywords: [
      // Top Intent High-Volume Keywords
      "free live tv",
      "free fta channels",
      "watch live tv online free",
      "fta channels worldwide",
      "free indian tv",
      "indian live tv",
      "us live tv free",
      "world live news streams",
      "live sports streaming free",
      "dd sports live streaming",
      "dd national live stream",
      "bloomberg tv live stream",
      "france 24 live stream english",
      "dw english live",
      "al jazeera english live stream",
      "nhk world japan live",
      "red bull tv live",
      // Channel-Specific Keywords
      `${channel.name} live`,
      `${channel.name} live stream`,
      `${channel.name} online free`,
      `${channel.hindiName} लाइव`,
      // BuzzClips Brand Variations
      "buzzclips tv",
      "buzz clips tv",
      "buzzclip live tv",
      "buzzclips free tv",
      "buzzclips fta channels",
      ...SEO_KEYWORD_GROUPS.HINDI_REGIONAL,
    ],
    alternates: {
      canonical: canonicalUrl,
      languages: generateHreflangAlternates(canonicalUrl),
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "video.other",
      locale: "en_IN",
      siteName: "BuzzClips TV",
      images: [
        {
          url: channel.logo || `${SITE_URL}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${channel.name} Live on BuzzClips TV`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [channel.logo || `${SITE_URL}/opengraph-image`],
    },
  };
}

export default async function LiveTvPage({ searchParams }: LiveTvPageProps) {
  const { channel: channelId } = await searchParams;

  if (channelId && ALL_LIVE_CHANNELS.some((c) => c.id === channelId)) {
    redirect(`/tv/${channelId}`);
  }

  const activeChannel =
    ALL_LIVE_CHANNELS.find((c) => c.id === channelId) ||
    ALL_LIVE_CHANNELS[0];

  const liveTvSchema = generateLiveTvSchema(activeChannel, SITE_URL);
  const breadcrumbsSchema = generateBreadcrumbSchema([
    { name: "Home", url: SITE_URL },
    { name: "BuzzClips TV (लाइव टीवी)", url: `${SITE_URL}/tv` },
    { name: `${activeChannel.name} (${activeChannel.country})`, url: `${SITE_URL}/tv?channel=${activeChannel.id}` },
  ]);
  const channelListSchema = generateChannelListSchema(ALL_LIVE_CHANNELS, SITE_URL);
  const faqSchema = generateLiveTvFaqSchema(SITE_URL);

  return (
    <>
      <script
        id="livetv-broadcast-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(liveTvSchema),
        }}
      />
      <script
        id="livetv-breadcrumbs-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(breadcrumbsSchema),
        }}
      />
      <script
        id="livetv-channellist-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(channelListSchema),
        }}
      />
      <script
        id="livetv-faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(faqSchema),
        }}
      />

      <Suspense
        fallback={
          <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <Skeleton className="lg:col-span-7 aspect-video rounded-2xl" />
              <Skeleton className="lg:col-span-5 h-[400px] rounded-2xl" />
            </div>
          </div>
        }
      >
        <LiveTvClient initialChannelId={activeChannel.id} />
      </Suspense>

      {/* Crawlable Semantic SEO Guide Section for Worldwide FTA & Indian TV */}
      <section className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-10 border-t border-border/40 mt-10 space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500 animate-pulse" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Watch Free-To-Air Live TV Online • {ALL_LIVE_CHANNELS.length}+ Official Worldwide HD Streams
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-4xl">
            Welcome to <strong>BuzzClips TV</strong>, your complete guide to <strong>free live television</strong> streaming online. Watch official, legal Free-To-Air (FTA) public broadcasts from India, USA, UK, Europe, Japan, South Korea, and international networks. Stream <strong>DD Sports</strong> (live cricket, hockey, and tournaments), <strong>Bloomberg Originals</strong>, <strong>France 24</strong>, <strong>DW English</strong>, <strong>Al Jazeera</strong>, <strong>NHK World Japan</strong>, and <strong>Red Bull TV</strong> in high-definition adaptive HLS with zero registration and zero buffering.
          </p>
        </div>

        {/* Popular SEO Keyword Topic Pills */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Trending Free-To-Air TV Searches
          </h3>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Free Live TV Worldwide", href: "/tv" },
              { label: "DD Sports Live Cricket", href: "/tv?channel=dd-sports" },
              { label: "Bloomberg Originals", href: "/tv?channel=bloomberg-originals" },
              { label: "France 24 English", href: "/tv?channel=france-24-en" },
              { label: "DW English (Germany)", href: "/tv?channel=dw-english" },
              { label: "Al Jazeera English", href: "/tv?channel=al-jazeera-en" },
              { label: "NHK World Japan", href: "/tv?channel=nhk-world-japan" },
              { label: "Red Bull TV Live Sports", href: "/tv?channel=red-bull-tv" },
              { label: "Scripps News 24/7", href: "/tv?channel=scripps-news" },
              { label: "Court TV Live Trials", href: "/tv?channel=court-tv" },
              { label: "Deluxe Music", href: "/tv?channel=deluxe-music" },
              { label: "Arirang TV Korea", href: "/tv?channel=arirang-tv" },
              { label: "CNA Singapore News", href: "/tv?channel=cna-singapore" },
              { label: "DD National Live Stream", href: "/tv?channel=dd-national" },
              { label: "DD News 24x7", href: "/tv?channel=dd-news" },
              { label: "Sansad TV Lok Sabha", href: "/tv?channel=sansad-tv-loksabha" },
              { label: "24H Free Movies", href: "/tv?channel=free-movies-24h" },
              { label: "Baby Shark TV Kids", href: "/tv?channel=baby-shark-tv" },
            ].map((topic) => (
              <Link
                key={topic.label}
                href={topic.href}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-card/80 hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border/50 transition-colors"
              >
                {topic.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
              <Tv className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">100% Free Public TV</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Official Free-To-Air (FTA) broadcasts with zero hidden subscriptions, paywalls, or mandatory sign-ups.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">Fast Buffer-Free HLS</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Adaptive bitrate streaming adjusts dynamically between 1080p, 720p, and 480p on any mobile or broadband network.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              <Globe className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">Global FTA Broadcasters</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Legitimate public service streams provided directly by national broadcasters and authorized international networks.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
