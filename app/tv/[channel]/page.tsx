import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { LiveTvClient } from "@/components/tv/LiveTvClient";
import { ALL_LIVE_CHANNELS } from "@/constants/liveChannels";
import { SEO_KEYWORD_GROUPS } from "@/constants/seoKeywords";
import {
  SITE_URL,
  generateLiveTvSchema,
  generateBreadcrumbSchema,
  generateChannelListSchema,
  generateSingleChannelFaqSchema,
  generateHreflangAlternates,
  serializeJsonLd,
} from "@/utility/seo";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio, Tv, Zap, Sparkles, ShieldCheck } from "lucide-react";

export const revalidate = 60;

export function generateStaticParams() {
  return ALL_LIVE_CHANNELS.map((channel) => ({
    channel: channel.id,
  }));
}

interface ChannelPageProps {
  params: Promise<{ channel: string }>;
}

export async function generateMetadata({
  params,
}: ChannelPageProps): Promise<Metadata> {
  const { channel: channelId } = await params;
  const channel = ALL_LIVE_CHANNELS.find((c) => c.id === channelId);

  if (!channel) {
    return {
      title: "Live TV Channel Not Found | BuzzClips TV",
    };
  }

  const isDdSports = channel.id === "dd-sports";
  const isDoordarshan = channel.broadcaster.toLowerCase().includes("doordarshan") || channel.name.startsWith("DD");

  const title = isDdSports
    ? `DD Sports Live Streaming (Free FTA) - Watch DD Sports Channel Online HD | BuzzClips TV`
    : isDoordarshan
      ? `${channel.name} (${channel.hindiName || channel.name}) Live Stream - Doordarshan Free TV | BuzzClips`
      : `${channel.name} (${channel.country}) Live Stream Free HD - Watch ${channel.name} Online | BuzzClips TV`;

  const description = isDdSports
    ? `Watch DD Sports (${channel.hindiName}) live stream free online in HD on BuzzClips TV. Official Doordarshan (Prasar Bharati) sports channel broadcasting live cricket matches, hockey, football, athletics, and national tournaments with zero buffering.`
    : `Watch ${channel.name} (${channel.hindiName || channel.name}) live stream free in HD on BuzzClips TV. Official Free-To-Air broadcast from ${channel.country} featuring ${channel.category.toLowerCase()} with zero lag and zero login.`;

  const canonicalUrl = `${SITE_URL}/tv/${channel.id}`;

  const channelSpecificKeywords = isDdSports
    ? [
        "dd sports live streaming",
        "dd sports channel",
        "dd doordarshan live",
        "dd sports live",
        "watch dd sports free online",
        "dd sports cricket live streaming",
        "dd sports live match",
        "doordarshan sports live",
        "doordarshan live tv",
        "dd sports fta",
        "dd sports free dish",
        "buzzclips tv dd sports",
        "free live sports streaming",
      ]
    : [
        `${channel.name.toLowerCase()} live`,
        `${channel.name.toLowerCase()} live stream`,
        `watch ${channel.name.toLowerCase()} online free`,
        `${channel.name.toLowerCase()} channel`,
        `${channel.name.toLowerCase()} hd stream`,
      ];

  return {
    title,
    description,
    keywords: [
      ...channelSpecificKeywords,
      `${channel.hindiName} लाइव`,
      `${channel.name} live tv`,
      "free live tv",
      "free fta channels",
      "indian live tv",
      "doordarshan live stream",
      "buzzclips live tv",
      "buzz clips tv",
      "buzzclip live tv",
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

export default async function ChannelLivePage({ params }: ChannelPageProps) {
  const { channel: channelId } = await params;
  const channel = ALL_LIVE_CHANNELS.find((c) => c.id === channelId);

  if (!channel) {
    notFound();
  }

  const liveTvSchema = generateLiveTvSchema(channel, SITE_URL);
  const breadcrumbsSchema = generateBreadcrumbSchema([
    { name: "Home", url: SITE_URL },
    { name: "BuzzClips TV (लाइव टीवी)", url: `${SITE_URL}/tv` },
    {
      name: `${channel.name} (${channel.country}) Live`,
      url: `${SITE_URL}/tv/${channel.id}`,
    },
  ]);
  const channelListSchema = generateChannelListSchema(
    ALL_LIVE_CHANNELS,
    SITE_URL
  );
  const faqSchema = generateSingleChannelFaqSchema(channel, SITE_URL);

  return (
    <>
      <script
        id="channel-livetv-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(liveTvSchema),
        }}
      />
      <script
        id="channel-breadcrumbs-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(breadcrumbsSchema),
        }}
      />
      <script
        id="channel-directory-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(channelListSchema),
        }}
      />
      <script
        id="channel-faq-schema"
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
        <LiveTvClient initialChannelId={channel.id} />
      </Suspense>

      {/* Semantic Crawlable Channel Guide Section */}
      <section className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-10 border-t border-border/40 mt-10 space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {channel.name} {channel.hindiName ? `(${channel.hindiName})` : ""} Live Streaming • Free Official Broadcast HD
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-4xl">
            Watch official 24x7 live stream of <strong>{channel.name}</strong> from{" "}
            <strong>{channel.broadcaster}</strong> ({channel.country}) on{" "}
            <strong>BuzzClips TV</strong>. Featuring buffer-free adaptive HLS streaming,
            instant full-screen playback, and zero subscription or registration.
          </p>
        </div>

        {/* Channel Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-border/50 bg-card/40 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Broadcaster
            </span>
            <p className="text-sm font-bold text-foreground truncate">{channel.broadcaster}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-border/50 bg-card/40 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Category
            </span>
            <p className="text-sm font-bold text-foreground">{channel.category}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-border/50 bg-card/40 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Country &amp; Flag
            </span>
            <p className="text-sm font-bold text-foreground">
              {channel.countryFlag} {channel.country}
            </p>
          </div>
          <div className="p-3.5 rounded-xl border border-border/50 bg-card/40 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Resolution
            </span>
            <p className="text-sm font-bold text-primary">{channel.resolution || "1080p Full HD"}</p>
          </div>
        </div>

        {/* Popular Channel Switcher Links */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Explore Other Free-To-Air Live TV Channels
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "DD Sports Live", href: "/tv/dd-sports" },
              { label: "DD National Live", href: "/tv/dd-national" },
              { label: "DD News 24x7", href: "/tv/dd-news" },
              { label: "DD India Global", href: "/tv/dd-india" },
              { label: "Sansad TV Lok Sabha", href: "/tv/sansad-tv-loksabha" },
              { label: "Bloomberg Originals", href: "/tv/bloomberg-originals" },
              { label: "France 24 English", href: "/tv/france-24-en" },
              { label: "DW English Germany", href: "/tv/dw-english" },
              { label: "Al Jazeera English", href: "/tv/al-jazeera-en" },
              { label: "NHK World Japan", href: "/tv/nhk-world-japan" },
              { label: "Red Bull TV Live Sports", href: "/tv/red-bull-tv" },
              { label: "All Worldwide Channels", href: "/tv" },
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
            <h3 className="text-sm font-semibold text-foreground">100% Free Public Broadcast</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Official Free-To-Air (FTA) broadcasts with zero hidden subscriptions, paywalls, or mandatory sign-ups.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Adaptive Bitrate HLS</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Low-latency HLS stream dynamically optimizes between 1080p, 720p, and 480p on broadband and mobile networks.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Authorized Legal Streams</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Legitimate public service broadcasts provided by national networks and authorized worldwide broadcasters.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
