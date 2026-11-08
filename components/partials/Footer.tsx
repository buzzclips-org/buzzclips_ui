"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitCommit } from "lucide-react";
import { LanguageSwitcher } from "@/components/partials/LanguageSwitcher";
import { useLanguage } from "@/store/language-context";

let fallbackBuildInfo: { commitSha?: string; buildNumber?: string } = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  fallbackBuildInfo = require("@/build-info.json");
} catch {
  // build-info.json may not exist in test runner or before build
}

export function Footer() {
  const pathname = usePathname();
  const { t } = useLanguage();

  if (pathname === "/reels" || pathname?.startsWith("/reels/") || pathname?.startsWith("/embed")) {
    return null;
  }
  const envSha = process.env.NEXT_PUBLIC_GIT_COMMIT_SHA;
  const commitSha = envSha ?? fallbackBuildInfo.commitSha ?? "dev";
  const buildNumber =
    process.env.NEXT_PUBLIC_BUILD_NUMBER ??
    fallbackBuildInfo.buildNumber ??
    "";
  const shortSha = commitSha.length > 7 ? commitSha.slice(0, 7) : commitSha;
  const commitUrl =
    commitSha !== "dev"
      ? `https://github.com/bideo-org/bideo_ui/commit/${shortSha}`
      : "https://github.com/bideo-org/bideo_ui";

  return (
    <footer className="w-full border-t mt-auto bg-background/80 backdrop-blur-sm text-muted-foreground pb-16 sm:pb-0">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 text-sm">
          {/* Brand & About Column */}
          <div className="md:col-span-5 space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                About | BuzzClips
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed max-w-sm">
                {t("footer.tagline")}
              </p>
            </div>
          </div>

          {/* Nav Links: 3 columns on desktop/tablet, compact 2/3 columns on mobile */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs sm:text-sm min-w-0">
            {/* Categories */}
            <div className="space-y-2 min-w-0">
              <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                Categories
              </h4>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <Link href="/category/tech" className="hover:text-foreground transition-colors">
                    Tech & Coding
                  </Link>
                </li>
                <li>
                  <Link href="/category/gaming" className="hover:text-foreground transition-colors">
                    Gaming Highlights
                  </Link>
                </li>
                <li>
                  <Link href="/category/entertainment" className="hover:text-foreground transition-colors">
                    Entertainment & Shorts
                  </Link>
                </li>
                <li>
                  <Link href="/category/music" className="hover:text-foreground transition-colors">
                    Music & Beats
                  </Link>
                </li>
                <li>
                  <Link href="/category/education" className="hover:text-foreground transition-colors">
                    Education & Tutorials
                  </Link>
                </li>
                <li>
                  <Link href="/category/lifestyle" className="hover:text-foreground transition-colors">
                    Lifestyle & Vlogs
                  </Link>
                </li>
              </ul>
            </div>

            {/* Quick Links */}
            <div className="space-y-2 min-w-0">
              <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                Quick Links
              </h4>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <Link href="/" className="hover:text-foreground transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/reels" className="hover:text-foreground transition-colors flex items-center gap-1.5 font-medium text-foreground">
                    <span>Reels & Shorts</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold">New</span>
                  </Link>
                </li>
                <li>
                  <Link href="/tv" className="hover:text-foreground transition-colors flex items-center gap-1.5 font-medium text-foreground">
                    <span>Live Indian TV</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                  </Link>
                </li>
                <li>
                  <Link href="/trending" className="hover:text-foreground transition-colors">
                    Trending
                  </Link>
                </li>
                <li>
                  <Link href="/history" className="hover:text-foreground transition-colors">
                    Watch History
                  </Link>
                </li>
                <li>
                  <Link href="/playlists" className="hover:text-foreground transition-colors">
                    Playlists
                  </Link>
                </li>
                <li>
                  <Link href="/video/upload" prefetch={false} className="hover:text-foreground transition-colors">
                    Upload
                  </Link>
                </li>
                <li>
                  <Link href="/contribute" className="hover:text-foreground transition-colors">
                    Contribute
                  </Link>
                </li>
                <li>
                  <Link href="/tech-stack" className="hover:text-foreground transition-colors">
                    Tech Stack
                  </Link>
                </li>
                <li>
                  <Link href="/status" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    System Status
                  </Link>
                </li>
                <li>
                  <a href="mailto:request@buzzclips.app" className="hover:text-foreground transition-colors">
                    Feature Requests
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal & Trust */}
            <div className="space-y-2 col-span-2 sm:col-span-1 min-w-0">
              <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                {t("footer.legalHeader")}
              </h4>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <Link href="/terms" className="hover:text-foreground transition-colors">
                    {t("footer.terms")}
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-foreground transition-colors">
                    {t("footer.privacy")}
                  </Link>
                </li>
                <li>
                  <Link href="/dmca" className="hover:text-foreground transition-colors">
                    {t("footer.dmca")}
                  </Link>
                </li>
                <li>
                  <Link href="/guidelines" className="hover:text-foreground transition-colors">
                    {t("footer.guidelines")}
                  </Link>
                </li>
                <li>
                  <a href="mailto:contact@buzzclips.app" className="hover:text-foreground transition-colors">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Popular SEO Searches & Live Indian TV Channels Directory */}
        <div className="border-t border-border/40 mt-8 pt-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-foreground tracking-wider uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>Popular Free Indian TV & Video Streaming Searches</span>
            </h4>
            <Link
              href="/tv"
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Watch Live TV Guide ➔
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground/80">
            <Link href="/" className="hover:text-primary transition-colors font-medium text-foreground/90">
              Buzz Clips
            </Link>
            <span>•</span>
            <Link href="/tv" className="hover:text-primary transition-colors font-medium text-foreground/90">
              Free Indian TV
            </Link>
            <span>•</span>
            <Link href="/tv?channel=dd-sports" className="hover:text-primary transition-colors">
              DD Sports Live Cricket
            </Link>
            <span>•</span>
            <Link href="/tv?channel=dd-national" className="hover:text-primary transition-colors">
              DD National Live Stream
            </Link>
            <span>•</span>
            <Link href="/tv?channel=dd-news" className="hover:text-primary transition-colors">
              DD News 24x7
            </Link>
            <span>•</span>
            <Link href="/tv?channel=sansad-tv-loksabha" className="hover:text-primary transition-colors">
              Sansad TV Live
            </Link>
            <span>•</span>
            <Link href="/tv?channel=dd-india" className="hover:text-primary transition-colors">
              DD India HD
            </Link>
            <span>•</span>
            <Link href="/" className="hover:text-primary transition-colors font-medium text-foreground/90">
              Free Video Streaming
            </Link>
            <span>•</span>
            <Link href="/tv" className="hover:text-primary transition-colors">
              BuzzClip TV
            </Link>
            <span>•</span>
            <Link href="/category/entertainment" className="hover:text-primary transition-colors">
              Web Series & Short Films
            </Link>
            <span>•</span>
            <Link href="/trending" className="hover:text-primary transition-colors">
              Trending Video Clips
            </Link>
            <span>•</span>
            <Link href="/reels" className="hover:text-primary transition-colors">
              Watch Reels Online Free
            </Link>
            <span>•</span>
            <Link href="/reels" className="hover:text-primary transition-colors">
              Buzz Clip Shorts
            </Link>
            <span>•</span>
            <Link href="/category/entertainment" className="hover:text-primary transition-colors">
              Video Podcasts & Shows
            </Link>
            <span>•</span>
            <Link href="/category/gaming" className="hover:text-primary transition-colors">
              Gaming Highlights
            </Link>
            <span>•</span>
            <Link href="/category/tech" className="hover:text-primary transition-colors">
              Tech & Coding Tutorials
            </Link>
            <span>•</span>
            <Link href="/category/music" className="hover:text-primary transition-colors">
              Music Beats Free
            </Link>
            <span>•</span>
            <Link href="/tv" className="hover:text-primary transition-colors">
              डीडी स्पोर्ट्स लाइव
            </Link>
            <span>•</span>
            <Link href="/tv" className="hover:text-primary transition-colors">
              फ्री इंडियन टीवी
            </Link>
            <span>•</span>
            <Link href="/" className="hover:text-primary transition-colors">
              बज़ क्लिप्स
            </Link>
          </div>
        </div>

        {/* Bottom Sub-bar */}
        <div className="border-t border-border/40 mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground text-center sm:text-left">
          <p suppressHydrationWarning>© {new Date().getFullYear()} BuzzClips | {t("footer.license")}</p>

          <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end">
            <LanguageSwitcher variant="full" />

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground border border-border/50 transition-colors">
              <span className="text-[11px] font-medium text-muted-foreground/80">
                build:
              </span>
              <Link
                href={commitUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] font-semibold text-foreground/80 hover:text-primary transition-colors flex items-center gap-1"
                title={
                  buildNumber
                    ? `Build #${buildNumber} (${commitSha})`
                    : `Commit ${commitSha}`
                }
              >
                <GitCommit className="w-3 h-3 text-muted-foreground" />
                <span>
                  {buildNumber ? `#${buildNumber} • ${shortSha}` : shortSha}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
