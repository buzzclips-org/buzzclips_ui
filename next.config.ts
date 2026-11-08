import type { NextConfig } from "next";
import { execSync } from "child_process";

import fs from "fs";
import path from "path";

function getGitCommitSha(): string {
  // 1. Direct environment variable check
  const envSha =
    process.env.NEXT_PUBLIC_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT ||
    process.env.GITHUB_SHA;

  if (envSha && envSha.trim() && envSha.trim() !== "dev") {
    return envSha.trim().slice(0, 7);
  }

  // 2. Read build-info.json if generated at build time
  try {
    const buildInfoPath = path.join(process.cwd(), "build-info.json");
    if (fs.existsSync(buildInfoPath)) {
      const data = JSON.parse(fs.readFileSync(buildInfoPath, "utf8"));
      if (data.commitSha && data.commitSha !== "dev") {
        return data.commitSha.slice(0, 7);
      }
    }
  } catch {
    // ignore
  }

  // 3. Try git CLI if available
  try {
    const rawSha = execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    if (rawSha) return rawSha.slice(0, 7);
  } catch {
    // git CLI unavailable
  }

  // 4. Pure Node.js .git filesystem inspection (works inside containers without git CLI)
  try {
    const gitDir = path.join(process.cwd(), ".git");
    if (fs.existsSync(gitDir)) {
      const head = fs.readFileSync(path.join(gitDir, "HEAD"), "utf8").trim();
      if (!head.startsWith("ref:")) return head.slice(0, 7);
      const refPath = head.replace(/^ref:\s*/, "");
      const fullRef = path.join(gitDir, refPath);
      if (fs.existsSync(fullRef)) {
        return fs.readFileSync(fullRef, "utf8").trim().slice(0, 7);
      }
      const packedRefs = path.join(gitDir, "packed-refs");
      if (fs.existsSync(packedRefs)) {
        const content = fs.readFileSync(packedRefs, "utf8");
        for (const line of content.split("\n")) {
          if (line.includes(refPath)) {
            return line.split(" ")[0].slice(0, 7);
          }
        }
      }
    }
  } catch {
    // ignore
  }

  return "dev";
}

function getBuildNumber(): string {
  const envBuild =
    process.env.NEXT_PUBLIC_BUILD_NUMBER ||
    process.env.BUILD_NUMBER;

  if (envBuild && envBuild.trim()) {
    return envBuild.trim();
  }

  try {
    const buildInfoPath = path.join(process.cwd(), "build-info.json");
    if (fs.existsSync(buildInfoPath)) {
      const data = JSON.parse(fs.readFileSync(buildInfoPath, "utf8"));
      if (data.buildNumber) return data.buildNumber.toString();
    }
  } catch {
    // ignore
  }

  return "";
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer =
  process.env.ANALYZE === "true"
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("@next/bundle-analyzer")({ enabled: true })
    : (config: NextConfig) => config;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GIT_COMMIT_SHA: getGitCommitSha(),
    NEXT_PUBLIC_BUILD_NUMBER: getBuildNumber(),
  },
  compress: true,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "framer-motion",
      "@tanstack/react-query",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-avatar",
      "@radix-ui/react-slot",
    ],
  },
  /* config options here */
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Language", value: "en" },
          { key: "Vary", value: "Accept-Language" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Prevent clickjacking on non-embed application routes while keeping /embed accessible for embeds
        source: "/((?!embed).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "github.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "buzzclips.app",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "bideo.tech",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "s3.ap-southeast-2.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "s3.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
