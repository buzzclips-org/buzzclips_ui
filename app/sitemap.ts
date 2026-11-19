import { MetadataRoute } from "next";
import { api_instance } from "@/global";
import { PaginatedVideoResponse } from "@/types/video";
import { SITE_URL, generateHreflangAlternates } from "@/utility/seo";
import { ALL_LIVE_CHANNELS } from "@/constants/liveChannels";
import { EDITOR_TOOLS } from "@/constants/editorTools";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
      alternates: {
        languages: generateHreflangAlternates(baseUrl),
      },
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
      alternates: {
        languages: generateHreflangAlternates(`${baseUrl}/explore`),
      },
    },
    {
      url: `${baseUrl}/tools`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: generateHreflangAlternates(`${baseUrl}/tools`),
      },
    },
    ...EDITOR_TOOLS.map((tool) => ({
      url: `${baseUrl}/tools/${tool.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: {
        languages: generateHreflangAlternates(`${baseUrl}/tools/${tool.slug}`),
      },
    })),
    {
      url: `${baseUrl}/tv`,
      lastModified: new Date(),
      changeFrequency: "always",
      priority: 1.0,
      alternates: {
        languages: generateHreflangAlternates(`${baseUrl}/tv`),
      },
    },
    {
      url: `${baseUrl}/reels`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
      alternates: {
        languages: generateHreflangAlternates(`${baseUrl}/reels`),
      },
    },
    {
      url: `${baseUrl}/trending`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
      alternates: {
        languages: generateHreflangAlternates(`${baseUrl}/trending`),
      },
    },
    ...ALL_LIVE_CHANNELS.map((channel) => ({
      url: `${baseUrl}/tv/${channel.id}`,
      lastModified: new Date(),
      changeFrequency: "always" as const,
      priority: channel.id === "dd-sports" || channel.id === "dd-national" ? 0.95 : 0.9,
      alternates: {
        languages: generateHreflangAlternates(`${baseUrl}/tv/${channel.id}`),
      },
    })),
    {
      url: `${baseUrl}/auth/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/auth/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/tech-stack`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/dmca`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/guidelines`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/contribute`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/status`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.4,
    },
    ...[
      "tech",
      "gaming",
      "education",
      "entertainment",
      "music",
      "news",
      "sports",
      "lifestyle",
      "other",
    ].map((cat) => ({
      url: `${baseUrl}/category/${cat}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];

  try {
    const res = await fetch(`${api_instance}/vid/all?page=0&size=500`, {
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data: PaginatedVideoResponse = await res.json();
      const videoPages: MetadataRoute.Sitemap = (data.content || [])
        .filter(
          (v) =>
            (v.videoStatus === "COMPLETED" || !v.videoStatus) &&
            v.visibility !== "PRIVATE"
        )
        .map((video) => ({
          url: `${baseUrl}/watch/${video.slug || video.videoId}`,
          lastModified: video.video_uploadDate
            ? new Date(video.video_uploadDate)
            : new Date(),
          changeFrequency: "weekly",
          priority: 0.8,
        }));

      return [...staticPages, ...videoPages];
    }
  } catch {
    // Fallback if backend is unreachable during static analysis
  }

  return staticPages;
}
