import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BuzzClips - Free Online Video Editor & Video Streaming",
    short_name: "BuzzClips",
    description:
      "Edit videos for free in your browser with no watermark or upload, then explore, share, and stream high-quality videos on BuzzClips with adaptive HLS streaming.",
    categories: ["video", "entertainment", "productivity"],
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#3b82f6",
    shortcuts: [
      {
        name: "Video Editor",
        short_name: "Editor",
        description: "Open the free in-browser video editor",
        url: "/",
      },
      {
        name: "Explore Videos",
        short_name: "Explore",
        description: "Browse trending creator videos",
        url: "/explore",
      },
      {
        name: "Reels & Shorts",
        short_name: "Reels",
        url: "/reels",
      },
      {
        name: "Live TV",
        short_name: "TV",
        url: "/tv",
      },
    ],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icon-48.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        src: "/icon-96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "/icon-144.png",
        sizes: "144x144",
        type: "image/png",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
