import { VideoDTO, UserDTO } from "@/types/video";
import { LiveChannel } from "@/constants/liveChannels";
import { SUPPORTED_LANGUAGES } from "@/constants/locales";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://buzzclips.app";

/**
 * Safely serializes schema data for JSON-LD script tags, escaping '<', '>', and '&'
 * to Unicode escape sequences to prevent script tag breakout and HTML parser XSS vulnerabilities.
 */
export function serializeJsonLd(schema: unknown): string {
  return JSON.stringify(schema)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * Generates Next.js metadata alternates.languages map for all 12 supported languages + x-default.
 */
export function generateHreflangAlternates(canonicalUrl: string): Record<string, string> {
  const cleanUrl = canonicalUrl.split("?")[0];
  const alternates: Record<string, string> = {
    "x-default": cleanUrl,
  };
  for (const lang of SUPPORTED_LANGUAGES) {
    alternates[lang.code] = `${cleanUrl}?hl=${lang.code}`;
  }
  return alternates;
}

/**
 * Normalizes any duration format (seconds, "MM:SS", "HH:MM:SS", or ISO 8601)
 * into a valid ISO 8601 duration string (e.g., "PT2M30S" or "PT1H12M45S")
 * required by Google VideoObject structured data.
 */
export function formatToIsoDuration(
  duration?: string | number | null
): string | undefined {
  if (!duration) return undefined;

  // Already valid ISO 8601 (e.g. PT1M30S or PT45S)
  if (typeof duration === "string" && /^PT(\d+H)?(\d+M)?(\d+S)?$/i.test(duration.trim())) {
    return duration.trim().toUpperCase();
  }

  let totalSeconds = 0;

  if (typeof duration === "number") {
    totalSeconds = Math.max(0, Math.floor(duration));
  } else if (typeof duration === "string") {
    const parts = duration.trim().split(":").map((p) => parseInt(p, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      totalSeconds = parts[0] * 60 + parts[1];
    } else if (
      parts.length === 3 &&
      !isNaN(parts[0]) &&
      !isNaN(parts[1]) &&
      !isNaN(parts[2])
    ) {
      totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else {
      const parsed = parseInt(duration, 10);
      if (!isNaN(parsed) && parsed > 0) {
        totalSeconds = parsed;
      }
    }
  }

  if (totalSeconds <= 0) return undefined;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let iso = "PT";
  if (hours > 0) iso += `${hours}H`;
  if (minutes > 0) iso += `${minutes}M`;
  if (seconds > 0 || (hours === 0 && minutes === 0)) iso += `${seconds}S`;

  return iso;
}

/**
 * Schema.org WebSite structured data with SearchAction for Google Sitelinks Searchbox.
 */
export function generateWebSiteSchema(siteUrl: string = SITE_URL) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: "BuzzClips",
    alternateName: [
      "BuzzClips",
      "Buzz Clips",
      "BuzzClip",
      "Buzz Clip",
      "BuzzClips TV",
      "Buzz Clips TV",
      "BuzzClip TV",
      "Buzz Clip TV",
      "BuzzClips Live TV",
      "Buzz Clips Live TV",
      "BuzzClips Free Indian TV",
      "Buzz Clips Video Streaming",
      "BuzzClip Video Streaming",
      "BuzzClips Platform",
      "Buzz Clips App",
      "BuzzClip App",
      "बज़क्लिप्स",
      "बज़ क्लिप्स",
    ],
    description:
      "Free video streaming website, Indian Live TV platform, web series, short films, and viral reels featuring buffer-free adaptive HLS playback, creator community tools, and official FTA TV channels.",
    disambiguatingDescription:
      "BuzzClips (also known as Buzz Clips or Buzz Clip) is a free video streaming and Indian live TV broadcast platform.",
    brand: {
      "@type": "Brand",
      name: "BuzzClips",
      alternateName: ["Buzz Clips", "Buzz Clip"],
    },
    inLanguage: SUPPORTED_LANGUAGES.map((l) => l.code),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/?query={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Schema.org Organization structured data for brand authority & Knowledge Graph entity.
 */
export function generateOrganizationSchema(siteUrl: string = SITE_URL) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: "BuzzClips",
    alternateName: [
      "BuzzClips",
      "Buzz Clips",
      "BuzzClip",
      "Buzz Clip",
      "BuzzClips TV",
      "Buzz Clips TV",
      "BuzzClip TV",
      "BuzzClips Streaming",
      "Buzz Clips Streaming",
      "BuzzClip Streaming",
      "BuzzClips Video Platform",
      "Buzz Clips Video Platform",
      "BuzzClips India",
      "Buzz Clips India",
      "बज़क्लिप्स",
      "बज़ क्लिप्स",
    ],
    disambiguatingDescription:
      "BuzzClips (also known as Buzz Clips or Buzz Clip) is a free video streaming and Indian live TV broadcast platform.",
    brand: {
      "@type": "Brand",
      name: "BuzzClips",
      alternateName: ["Buzz Clips", "Buzz Clip"],
    },
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/icon-512.png`,
      width: 512,
      height: 512,
    },
    knowsAbout: [
      "Indian Live TV Streaming",
      "Free Indian TV Online",
      "Free Video Streaming Website",
      "Web Series & Short Films Streaming",
      "Video Podcasts & Creator Talk Shows",
      "Adaptive Bitrate HLS Playback",
      "Viral Video Shorts & Reels",
      "Doordarshan & Free-To-Air Television",
      "Live Cricket & Sports Streaming",
      "Online Video Platform & Creator Media",
    ],
    sameAs: [
      "https://github.com/bideo-org/bideo_ui",
    ],
  };
}

/**
 * Schema.org SiteNavigationElement structured data to encourage Google Sitelinks.
 */
export function generateSiteNavigationSchema(siteUrl: string = SITE_URL) {
  const navItems = [
    { name: "Explore Videos", url: siteUrl, description: "Discover trending video clips and creator uploads" },
    { name: "Tech & Coding", url: `${siteUrl}/category/tech`, description: "Software development, AI, and tech clips" },
    { name: "Gaming Highlights", url: `${siteUrl}/category/gaming`, description: "Esports clips, walkthroughs, and gameplay highlights" },
    { name: "Entertainment", url: `${siteUrl}/category/entertainment`, description: "Viral humor, skits, and entertainment shorts" },
    { name: "Music & Beats", url: `${siteUrl}/category/music`, description: "Music clips, live sessions, and original tracks" },
    { name: "Upload Video", url: `${siteUrl}/video/upload`, description: "Upload video clips with automatic HLS encoding" },
    { name: "Community Guidelines", url: `${siteUrl}/guidelines`, description: "BuzzClips community standards and rules" },
  ];

  return {
    "@context": "https://schema.org",
    "@graph": navItems.map((item) => ({
      "@type": "SiteNavigationElement",
      name: item.name,
      url: item.url,
      description: item.description,
    })),
  };
}

/**
 * Schema.org SoftwareApplication / WebApplication structured data for platform authority.
 */
export function generateSoftwareApplicationSchema(siteUrl: string = SITE_URL) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "BuzzClips",
    alternateName: [
      "BuzzClips App",
      "Buzz Clips App",
      "BuzzClip App",
      "Buzz Clip App",
      "Buzz Clips",
      "BuzzClip",
    ],
    url: siteUrl,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "All (Web Browser, iOS, Android, macOS, Windows, Linux)",
    description:
      "BuzzClips is a next-generation video streaming and creator clip platform featuring zero-lag adaptive HLS streaming, interactive engagement, and instant discovery.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "1250",
      bestRating: "5",
      worstRating: "1",
    },
    featureList: [
      "Adaptive Bitrate HLS Video Streaming",
      "Interactive Timestamp Comments",
      "Real-time Video Engagement & Likes",
      "Instant Video Search & Category Filtering",
      "Fast Creator Uploads with Automatic Transcoding",
    ],
  };
}

/**
 * Schema.org FAQPage structured data to win Google SERP FAQ rich snippets.
 */
export function generateFaqSchema(siteUrl: string = SITE_URL) {
  const faqs = [
    {
      question: "What is BuzzClips (Buzz Clips)?",
      answer:
        "BuzzClips (also known as Buzz Clips or Buzz Clip) is a next-generation video streaming and creator clip platform that delivers lightning-fast, buffer-free video playback powered by adaptive HLS technology. Viewers can watch trending viral clips, gaming highlights, tech tutorials, and entertainment videos, alongside official Free-To-Air Indian Live TV channels.",
    },
    {
      question: "Is BuzzClips completely free to watch and use?",
      answer:
        "Yes! BuzzClips is 100% free to explore, stream, and share videos. Anyone can watch high-definition videos with adaptive bitrate streaming without any subscription fee.",
    },
    {
      question: "How does BuzzClips provide buffer-free video streaming?",
      answer:
        "BuzzClips utilizes automated HTTP Live Streaming (HLS) transcoding and adaptive bitrate switching. The player dynamically adjusts resolution in real-time according to your network bandwidth, ensuring instant playback on mobile and desktop devices.",
    },
    {
      question: "How do I upload and share video clips on BuzzClips?",
      answer:
        "Simply create a free BuzzClips account or sign in, navigate to the Upload Video section, select your MP4 or WebM video file, and add your title, category, and tags. BuzzClips automatically processes and optimizes your video for immediate worldwide streaming.",
    },
    {
      question: "What categories of video content are available on BuzzClips?",
      answer:
        "BuzzClips offers an expansive range of categories including Tech & Coding, Gaming, Education & Tutorials, Entertainment & Comedy, Music & Beats, News, Sports & Fitness, and Lifestyle vlogs.",
    },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * BreadcrumbList schema for enhanced SERP presentation.
 */
export function generateBreadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Google-compliant VideoObject schema for watch pages.
 */
export function generateVideoJsonLd(
  video: VideoDTO,
  siteUrl: string = SITE_URL
) {
  const watchUrl = `${siteUrl}/watch/${video.slug || video.videoId}`;
  const title = video.seo?.title || video.video_title || "Watch Video";
  const description =
    video.seo?.description ||
    video.description ||
    `Watch ${title} on BuzzClips. Fast adaptive HLS streaming with instant playback.`;
  const thumbnailUrl = video.thumbnail_url || `${siteUrl}/favicon.ico`;
  const uploadDate = video.video_uploadDate
    ? new Date(video.video_uploadDate).toISOString()
    : new Date().toISOString();

  const durationIso =
    formatToIsoDuration(video.iso_duration) ||
    formatToIsoDuration(video.video_duration);

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: title,
    description,
    thumbnailUrl: [thumbnailUrl],
    uploadDate,
    contentUrl: video.m3u8Url,
    embedUrl: `${siteUrl}/embed/${video.slug || video.videoId}`,
    inLanguage: "en",
    isFamilyFriendly: true,
    publisher: {
      "@type": "Organization",
      name: "BuzzClips",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon-512.png`,
        width: 512,
        height: 512,
      },
    },
    potentialAction: {
      "@type": "SeekToAction",
      target: `${watchUrl}?t={seek_to_second_number}`,
      "startOffset-input": "required name=seek_to_second_number",
    },
    ...(durationIso ? { duration: durationIso } : {}),
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: { "@type": "https://schema.org/WatchAction" },
      userInteractionCount: video.video_views || 0,
    },
    author: {
      "@type": "Person",
      name: video.video_uploader?.user_name || "BuzzClips Creator",
      url: video.video_uploader?.userId
        ? `${siteUrl}/profile/${video.video_uploader.userId}`
        : siteUrl,
    },
    ...(video.tags && video.tags.length > 0
      ? { keywords: video.tags.join(", ") }
      : {}),
  };
}

/**
 * Schema.org ProfilePage & Person structured data for creator channel & profile pages.
 */
export function generateProfilePageSchema(
  user: UserDTO,
  canonicalUrl: string,
  siteUrl: string = SITE_URL
) {
  const displayName = user.fullName || user.user_name || "Creator";
  const handle = user.username
    ? `@${user.username}`
    : user.user_name
    ? `@${user.user_name}`
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: `${displayName} on BuzzClips`,
    mainEntity: {
      "@type": "Person",
      "@id": `${canonicalUrl}#person`,
      name: displayName,
      ...(handle ? { alternateName: handle } : {}),
      url: canonicalUrl,
      ...(user.avatar_url ? { image: user.avatar_url } : {}),
      description: `Watch videos and creator content from ${displayName} on BuzzClips.`,
    },
  };
}

/**
 * Generates Google-compliant Schema.org BroadcastEvent and BroadcastService
 * for Indian Live TV streaming, enabling the red "🔴 LIVE" badge on Google SERP.
 */
export function generateLiveTvSchema(
  channel: LiveChannel,
  siteUrl: string = SITE_URL
) {
  const channelUrl = `${siteUrl}/tv?channel=${channel.id}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BroadcastService",
        "@id": `${channelUrl}#broadcast-service`,
        name: `${channel.name} (${channel.hindiName}) Live TV`,
        alternateName: [channel.hindiName, `${channel.name} Live Stream`, `${channel.name} Free TV`],
        broadcaster: {
          "@type": "Organization",
          name: channel.broadcaster,
        },
        areaServed: {
          "@type": "Country",
          name: channel.country || "India",
        },
        inLanguage: channel.language,
        isLiveBroadcast: true,
        broadcastDisplayName: channel.name,
        description: channel.description,
        videoFormat: "HD",
      },
      {
        "@type": "BroadcastEvent",
        "@id": `${channelUrl}#broadcast-event`,
        name: `${channel.name} - 24x7 Live Stream Online | BuzzClips TV`,
        isLiveBroadcast: true,
        startDate: "2026-01-01T00:00:00+05:30",
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
        location: {
          "@type": "VirtualLocation",
          url: channelUrl,
        },
        video: {
          "@type": "VideoObject",
          name: `${channel.name} Live Stream Free Online`,
          description: channel.description,
          thumbnailUrl: [channel.logo, `${siteUrl}/icon-512.png`],
          uploadDate: "2026-01-01T00:00:00+05:30",
          contentUrl: channel.streamUrl,
          embedUrl: channelUrl,
          publication: {
            "@type": "BroadcastEvent",
            isLiveBroadcast: true,
            startDate: "2026-01-01T00:00:00+05:30",
          },
        },
      },
    ],
  };
}

/**
 * Schema.org ItemList structured data for the Free-To-Air Live Channel Guide directory.
 */
export function generateChannelListSchema(
  channels: LiveChannel[],
  siteUrl: string = SITE_URL
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Free-To-Air Live TV Channels Directory",
    description: "Official legal worldwide Free-To-Air TV broadcast channels streaming online in HD.",
    numberOfItems: channels.length,
    itemListElement: channels.map((channel, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${channel.name} (${channel.country})`,
      url: `${siteUrl}/tv?channel=${channel.id}`,
      description: channel.description,
      image: channel.logo,
    })),
  };
}

/**
 * Schema.org FAQPage structured data for BuzzClips TV.
 * Optimizes ranking and triggers SERP question accordions for "buzzclips tv" queries.
 */
export function generateLiveTvFaqSchema(siteUrl: string = SITE_URL) {
  const faqs = [
    {
      question: "What is BuzzClips TV?",
      answer:
        "BuzzClips TV is India's premier free live television streaming destination on BuzzClips, broadcasting official, authorized Free-To-Air (FTA) national, news, sports, and cultural channels in high-definition (HD) with zero lag and zero login required.",
    },
    {
      question: "How can I watch Indian live TV online for free on BuzzClips TV?",
      answer:
        "Simply visit BuzzClips TV at https://buzzclips.app/tv on any mobile phone, tablet, smart TV, or desktop browser. Select any channel from the live Channel Guide or Quick Dial carousel to begin buffer-free HLS streaming immediately.",
    },
    {
      question: "Which TV channels are available on BuzzClips TV?",
      answer:
        "BuzzClips TV features a curated lineup of official Indian channels including DD National, DD News, DD Sports, DD India, Sansad TV Lok Sabha, Sansad TV Rajya Sabha, Zee News, NDTV India, DD Kisan, DD Bharati, DD Retro, and DD Urdu.",
    },
    {
      question: "Is BuzzClips TV legal and free to watch?",
      answer:
        "Yes, BuzzClips TV streams official public service Free-To-Air (FTA) broadcasts authorized by Prasar Bharati (Doordarshan), the Parliament of India, and recognized national broadcasters. It is completely legal, free, and does not require any paid subscription or account creation.",
    },
    {
      question: "Does BuzzClips TV support HD and mobile streaming?",
      answer:
        "Yes, BuzzClips TV utilizes adaptive bitrate HLS (HTTP Live Streaming) technology, automatically delivering up to 1080p Full HD resolution on broadband and smoothly adjusting on 4G/5G mobile connections to eliminate buffering.",
    },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generates channel-specific Schema.org FAQPage for dedicated TV channel landing pages.
 */
export function generateSingleChannelFaqSchema(
  channel: LiveChannel,
  siteUrl: string = SITE_URL
) {
  const isDdSports = channel.id === "dd-sports";
  const isDdNational = channel.id === "dd-national";

  const faqs = [
    {
      question: `How can I watch ${channel.name} live streaming online for free?`,
      answer: `You can watch ${channel.name} live stream 100% free in HD on BuzzClips TV at ${siteUrl}/tv/${channel.id}. No subscription, payment, or account registration is required.`,
    },
    isDdSports
      ? {
          question: "Does DD Sports broadcast live cricket and national sporting events?",
          answer:
            "Yes! DD Sports is India's premier public sports broadcaster airing live coverage of Indian national cricket matches (ODIs, T20Is, and Tests), Olympic games, Asian Games, National Games, and major hockey tournaments free-to-air.",
        }
      : {
          question: `What type of programs are broadcast on ${channel.name}?`,
          answer: `${channel.name} broadcasts official Free-To-Air ${channel.category.toLowerCase()} programming by ${channel.broadcaster} in ${channel.language.join(", ")}, with adaptive bitrate streaming up to ${channel.resolution || "1080p HD"}.`,
        },
    isDdSports || isDdNational
      ? {
          question: `Is ${channel.name} an official Doordarshan channel?`,
          answer: `Yes, ${channel.name} (${channel.hindiName || channel.name}) is an official Free-To-Air public broadcast operated by Prasar Bharati (Doordarshan), India's national public service broadcaster.`,
        }
      : {
          question: `Is ${channel.name} legal and safe to watch on BuzzClips TV?`,
          answer: `Yes, BuzzClips TV features legitimate, authorized Free-To-Air (FTA) public service streams provided directly by official broadcasters from ${channel.country}.`,
        },
    {
      question: `Does ${channel.name} live stream support mobile devices?`,
      answer: `Yes, ${channel.name} utilizes adaptive HLS streaming, automatically adapting across 1080p, 720p, and 480p on iOS, Android, macOS, and Windows devices with zero buffering.`,
    },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}




