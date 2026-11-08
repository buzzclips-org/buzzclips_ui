import { getVideoBySlug, getVideoById } from "@/utility/requests";
import { VideoDTO } from "@/types/video";
import { SITE_URL } from "@/utility/seo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const urlParam = searchParams.get("url");

  if (!urlParam) {
    return Response.json(
      { error: "Missing required 'url' parameter" },
      { status: 400 }
    );
  }

  let video: VideoDTO | null = null;
  const baseUrl = SITE_URL;

  try {
    const parsedUrl = new URL(urlParam);
    const pathname = parsedUrl.pathname;

    // Check /watch/[slug]
    const watchMatch = pathname.match(/\/watch\/([^/?#]+)/);
    // Check /video/[id]/view
    const legacyMatch = pathname.match(/\/video\/([^/?#]+)\/view/);

    if (watchMatch && watchMatch[1]) {
      const identifier = decodeURIComponent(watchMatch[1]);
      if (/^\d+$/.test(identifier)) {
        video = await getVideoById(identifier);
      } else {
        video = await getVideoBySlug(identifier);
      }
    } else if (legacyMatch && legacyMatch[1]) {
      const identifier = decodeURIComponent(legacyMatch[1]);
      if (/^\d+$/.test(identifier)) {
        video = await getVideoById(identifier);
      } else {
        video = await getVideoBySlug(identifier);
      }
    }
  } catch (err) {
    console.error("Error resolving video for oEmbed:", err);
  }

  if (!video) {
    return Response.json(
      { error: "Video not found for provided URL" },
      { status: 404 }
    );
  }

  const embedUrl = `${baseUrl}/embed/${video.slug || video.videoId}`;
  const authorName = video.video_uploader?.user_name || "BuzzClips Creator";
  const authorUrl = video.video_uploader?.userId
    ? `${baseUrl}/profile/${video.video_uploader.userId}`
    : baseUrl;

  const escapedTitle = (video.video_title || "BuzzClips Video")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const oembedResponse = {
    type: "video",
    version: "1.0",
    title: video.video_title,
    author_name: authorName,
    author_url: authorUrl,
    provider_name: "BuzzClips",
    provider_url: baseUrl,
    thumbnail_url: video.thumbnail_url || `${baseUrl}/favicon.ico`,
    thumbnail_width: 1280,
    thumbnail_height: 720,
    width: 1280,
    height: 720,
    html: `<iframe src="${embedUrl}" width="1280" height="720" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen title="${escapedTitle}"></iframe>`,
  };

  return Response.json(oembedResponse, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
