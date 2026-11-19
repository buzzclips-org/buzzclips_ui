import { api_instance } from "@/global";
import { PaginatedVideoResponse, VideoDTO } from "@/types/video";
import { SITE_URL, hreflangSitemapLinks } from "@/utility/seo";
import { ALL_LIVE_CHANNELS } from "@/constants/liveChannels";

function escapeXml(str: string): string {
  return str.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return char;
    }
  });
}

function parseDurationToSeconds(durationStr?: string): number | null {
  if (!durationStr) return null;
  // Handle ISO 8601 like PT1M30S
  const isoMatch = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (isoMatch) {
    const hours = parseInt(isoMatch[1] || "0", 10);
    const minutes = parseInt(isoMatch[2] || "0", 10);
    const seconds = parseInt(isoMatch[3] || "0", 10);
    const total = hours * 3600 + minutes * 60 + seconds;
    return total > 0 ? total : null;
  }
  // Handle "MM:SS" or "HH:MM:SS"
  const parts = durationStr.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (
    parts.length === 3 &&
    !isNaN(parts[0]) &&
    !isNaN(parts[1]) &&
    !isNaN(parts[2])
  ) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}

export async function GET() {
  const baseUrl = SITE_URL;
  let videos: VideoDTO[] = [];

  try {
    const res = await fetch(`${api_instance}/vid/all?page=0&size=500`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data: PaginatedVideoResponse = await res.json();
      videos = (data.content || []).filter(
        (v) =>
          (v.videoStatus === "COMPLETED" || !v.videoStatus) &&
          v.visibility !== "PRIVATE"
      );
    }
  } catch (error) {
    console.error("Failed to fetch videos for video-sitemap:", error);
  }

  const videoEntries = videos
    .map((video) => {
      const watchUrl = `${baseUrl}/watch/${video.slug || video.videoId}`;
      const title = escapeXml(video.video_title || "Untitled Video");
      const description = escapeXml(
        video.description ||
          video.seo?.description ||
          `Watch ${video.video_title} on BuzzClips.`
      );
      const thumbnail =
        video.thumbnail_url || `${baseUrl}/favicon.ico`;
      const pubDate = video.video_uploadDate
        ? new Date(video.video_uploadDate).toISOString()
        : new Date().toISOString();
      const durationSeconds =
        parseDurationToSeconds(video.iso_duration || video.video_duration) || 120;
      const views = video.video_views || 0;
      const uploader = escapeXml(
        video.video_uploader?.user_name || "BuzzClips Creator"
      );

      const categoryXml = video.category
        ? `      <video:category>${escapeXml(video.category)}</video:category>\n`
        : "";

      const tagsXml = (video.tags || [])
        .slice(0, 32)
        .map((tag) => `      <video:tag>${escapeXml(tag)}</video:tag>`)
        .join("\n");

      const alternatesXml = hreflangSitemapLinks(watchUrl);

      return `  <url>
    <loc>${escapeXml(watchUrl)}</loc>
${alternatesXml}
    <video:video>
      <video:thumbnail_loc>${escapeXml(thumbnail)}</video:thumbnail_loc>
      <video:title>${title}</video:title>
      <video:description>${description}</video:description>
      ${
        video.m3u8Url
          ? `<video:content_loc>${escapeXml(video.m3u8Url)}</video:content_loc>`
          : ""
      }
      <video:player_loc allow_embed="yes">${escapeXml(watchUrl)}</video:player_loc>
      <video:duration>${durationSeconds}</video:duration>
      <video:view_count>${views}</video:view_count>
      <video:publication_date>${pubDate}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:live>no</video:live>
${categoryXml}      <video:uploader info="${baseUrl}/profile/${escapeXml(
        video.video_uploader?.userId || ""
      )}">${uploader}</video:uploader>
${tagsXml ? tagsXml + "\n" : ""}    </video:video>
  </url>`;
    })
    .join("\n");

  const liveChannelEntries = ALL_LIVE_CHANNELS.map((channel) => {
    const channelUrl = `${baseUrl}/tv/${channel.id}`;
    const isDdSports = channel.id === "dd-sports";
    const title = isDdSports
      ? "DD Sports Live Streaming (Free FTA) - Watch Live Cricket &amp; Sports HD"
      : `${escapeXml(channel.name)} Live Streaming - Watch ${escapeXml(channel.name)} Free HD | BuzzClips TV`;
    const description = escapeXml(
      isDdSports
        ? "Watch DD Sports live stream free online in HD on BuzzClips TV. Official Doordarshan sports channel broadcasting live cricket matches, hockey, athletics, and tournaments with zero buffering."
        : `Watch ${channel.name} (${channel.hindiName || channel.name}) live stream free online in HD on BuzzClips TV. Official Free-To-Air broadcast from ${channel.country}.`
    );
    const thumbnail = escapeXml(channel.logo || `${baseUrl}/icon-512.png`);

    const tags = isDdSports
      ? [
          "dd sports live streaming",
          "dd sports channel",
          "dd doordarshan live",
          "dd sports live",
          "doordarshan sports",
          "live cricket streaming free",
          "free live tv",
        ]
      : [
          `${channel.name.toLowerCase()} live`,
          `${channel.name.toLowerCase()} live stream`,
          "free live tv",
          "fta channels",
          `${channel.country.toLowerCase()} live tv`,
        ];

    const tagsXml = tags
      .map((tag) => `      <video:tag>${escapeXml(tag)}</video:tag>`)
      .join("\n");

    const alternatesXml = hreflangSitemapLinks(channelUrl);

    return `  <url>
    <loc>${escapeXml(channelUrl)}</loc>
${alternatesXml}
    <video:video>
      <video:thumbnail_loc>${thumbnail}</video:thumbnail_loc>
      <video:title>${title}</video:title>
      <video:description>${description}</video:description>
      <video:content_loc>${escapeXml(channel.streamUrl)}</video:content_loc>
      <video:player_loc allow_embed="yes">${escapeXml(channelUrl)}</video:player_loc>
      <video:publication_date>2026-01-01T00:00:00+05:30</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:live>yes</video:live>
      <video:category>${escapeXml(channel.category)}</video:category>
      <video:uploader info="${baseUrl}/tv">BuzzClips TV</video:uploader>
${tagsXml}
    </video:video>
  </url>`;
  }).join("\n");

  const allEntries = [liveChannelEntries, videoEntries].filter(Boolean).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allEntries}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
