"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useInfiniteQuery, InfiniteData } from "@tanstack/react-query";
import { fetchVideos, searchVideos } from "@/utility/requests";
import VideoCard from "@/components/video/VideoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MESSAGES } from "@/constants/messages";
import { Search, X, Film, Tag, AlertTriangle, RefreshCw, Activity } from "lucide-react";
import Link from "next/link";
import { VideoDTO, PaginatedVideoResponse } from "@/types/video";
import { motion } from "framer-motion";
import { useLanguage } from "@/store/language-context";

export const CATEGORIES: { label: string; value: string; slug: string; icon?: string }[] = [
  { label: "All", value: "ALL", slug: "", icon: "🔥" },
  { label: "Tech", value: "TECH", slug: "tech", icon: "💻" },
  { label: "Education", value: "EDUCATION", slug: "education", icon: "🎓" },
  { label: "Gaming", value: "GAMING", slug: "gaming", icon: "🎮" },
  { label: "Entertainment", value: "ENTERTAINMENT", slug: "entertainment", icon: "🎬" },
  { label: "Music", value: "MUSIC", slug: "music", icon: "🎵" },
  { label: "News", value: "NEWS", slug: "news", icon: "📰" },
  { label: "Sports", value: "SPORTS", slug: "sports", icon: "⚽" },
  { label: "Lifestyle", value: "LIFESTYLE", slug: "lifestyle", icon: "🌿" },
  { label: "Other", value: "OTHER", slug: "other", icon: "🌐" },
];

interface ExploreClientProps {
  initialVideos?: VideoDTO[];
  initialPage?: PaginatedVideoResponse | null;
  defaultCategory?: string;
  defaultTag?: string;
}

export default function ExploreClient({
  initialVideos = [],
  initialPage = null,
  defaultCategory = "ALL",
  defaultTag = "",
}: ExploreClientProps) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const observerRef = useRef<HTMLDivElement | null>(null);

  const urlQuery = searchParams.get("query") || "";
  const urlCategory = searchParams.get("category") || defaultCategory;
  const urlTag = searchParams.get("tag") || defaultTag;

  const [searchInput, setSearchInput] = useState(urlQuery);
  const [activeQuery, setActiveQuery] = useState(urlQuery);
  const [activeCategory, setActiveCategory] = useState<string>(urlCategory);
  const [activeTag, setActiveTag] = useState<string>(urlTag);

  // Sync state if URL searchParams change
  useEffect(() => {
    const q = searchParams.get("query") || "";
    const cat = searchParams.get("category") || defaultCategory;
    const t = searchParams.get("tag") || defaultTag;

    if (q !== activeQuery) {
      setSearchInput(q);
      setActiveQuery(q);
    }
    if (cat !== activeCategory) {
      setActiveCategory(cat);
    }
    if (t !== activeTag) {
      setActiveTag(t);
    }
  }, [searchParams, defaultCategory, defaultTag]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search input for live results (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveQuery(searchInput.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const isFiltered =
    activeQuery.trim().length > 0 ||
    activeCategory !== "ALL" ||
    activeTag.trim().length > 0;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useInfiniteQuery<
    PaginatedVideoResponse,
    Error,
    InfiniteData<PaginatedVideoResponse>,
    ["videos", string, string, string],
    number
  >({
    queryKey: ["videos", activeQuery, activeCategory, activeTag],
    initialPageParam: 0,
    initialData:
      !isFiltered && initialPage
        ? {
            pages: [initialPage],
            pageParams: [0],
          }
        : undefined,
    queryFn: ({ pageParam }) => {
      if (isFiltered) {
        return searchVideos(
          activeQuery,
          activeCategory === "ALL" ? undefined : activeCategory,
          activeTag || undefined,
          pageParam,
          12
        );
      }
      return fetchVideos(pageParam);
    },
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.number + 1,
    staleTime: 60 * 1000,
    retry: 1,
  });

  // Preserve order and deduplicate
  const videoMap = new Set<number>();
  const videoList: VideoDTO[] = [];

  // If data is available from React Query, use it; otherwise fallback to initialVideos during first hydration
  if (data?.pages && data.pages.length > 0) {
    data.pages.forEach((page) => {
      page.content.forEach((video) => {
        if (
          (video.videoStatus === "COMPLETED" || !video.videoStatus) &&
          !videoMap.has(video.videoId)
        ) {
          videoList.push(video);
          videoMap.add(video.videoId);
        }
      });
    });
  } else if (!isFiltered && initialVideos.length > 0) {
    initialVideos.forEach((video) => {
      if (!videoMap.has(video.videoId)) {
        videoList.push(video);
        videoMap.add(video.videoId);
      }
    });
  }

  // Toast on error
  useEffect(() => {
    if (error) toast.error(MESSAGES.EXPLORE_VIDEO_ERROR);
  }, [error]);

  // Infinite scroll logic
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1 }
    );

    const el = observerRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setActiveQuery("");
    setActiveTag("");
  };

  const handleCategorySelect = (categoryValue: string) => {
    setActiveCategory(categoryValue);
    if (categoryValue === "ALL") {
      router.push("/");
    } else {
      const catObj = CATEGORIES.find((c) => c.value === categoryValue);
      if (catObj?.slug) {
        router.push(`/category/${catObj.slug}`);
      }
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden flex justify-center py-6">
      <div className="w-full lg:max-w-[85%] sm:max-w-full px-4 space-y-6 min-w-0 max-w-full">
        {/* === Header & Search Bar Section === */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground break-words">
              {activeCategory !== "ALL"
                ? `${CATEGORIES.find((c) => c.value === activeCategory)?.label || activeCategory} Videos`
                : activeTag
                  ? `Videos tagged #${activeTag}`
                  : "BuzzClips (Buzz Clips) - Explore Trending Videos & Live TV"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Discover, watch, and search videos from creators around the world on BuzzClips.
            </p>
          </div>

          {/* Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative w-full max-w-full md:w-96"
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              type="text"
              placeholder={t("explore.searchPlaceholder")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 pr-20 h-11 bg-card/80 border-border/60 backdrop-blur-sm rounded-full shadow-sm text-sm focus-visible:border-primary/50"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="p-1 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <Button
                type="submit"
                size="sm"
                className="h-8 rounded-full px-3 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {t("explore.searchButton")}
              </Button>
            </div>
          </form>
        </div>

        {/* === Category Filter Pills === */}
        <div className="w-full max-w-full min-w-0 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.value;
            return (
              <motion.button
                key={cat.value}
                onClick={() => handleCategorySelect(cat.value)}
                aria-label={cat.label}
                whileTap={{ scale: 0.95 }}
                className={`relative flex items-center gap-1.5 whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150 shrink-0 ${
                  isSelected
                    ? "text-primary-foreground"
                    : "bg-card/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeCategoryPill"
                    className="absolute inset-0 rounded-full bg-primary shadow-sm shadow-primary/25 -z-0"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {cat.icon && <span aria-hidden="true">{cat.icon}</span>}
                  <span>{cat.label}</span>
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Active Filter Chips Bar */}
        {isFiltered && (
          <div className="w-full max-w-full min-w-0 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-1 border-t border-border/40">
            <div className="flex flex-wrap items-center gap-2">
              <span>Showing results for:</span>
              {activeQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
                  &ldquo;{activeQuery}&rdquo;
                  <button
                    onClick={() => {
                      setSearchInput("");
                      setActiveQuery("");
                    }}
                    className="hover:text-foreground"
                    title="Remove query filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {activeCategory !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
                  {CATEGORIES.find((c) => c.value === activeCategory)?.label}
                  <button
                    onClick={() => setActiveCategory("ALL")}
                    className="hover:text-foreground"
                    title="Remove category filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {activeTag && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium border border-blue-500/20">
                  <Tag className="w-2.5 h-2.5" />
                  #{activeTag}
                  <button
                    onClick={() => setActiveTag("")}
                    className="hover:text-foreground"
                    title="Remove tag filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                handleClearSearch();
                setActiveCategory("ALL");
                setActiveTag("");
              }}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset all filters
            </Button>
          </div>
        )}

        {/* Video Grid */}
        <motion.div
          key={`${activeCategory}-${activeTag}-${activeQuery}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          {isLoading && videoList.length === 0
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="w-full aspect-video rounded-xl" />
                  <div className="flex gap-3">
                    <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="w-full h-4" />
                      <Skeleton className="w-2/3 h-3" />
                    </div>
                  </div>
                </div>
              ))
            : videoList.map((video) => (
                <VideoCard key={video.videoId} video={video} />
              ))}

          {isFetchingNextPage &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={`loading-${i}`} className="space-y-3">
                <Skeleton className="w-full aspect-video rounded-xl" />
                <div className="flex gap-3">
                  <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="w-full h-4" />
                    <Skeleton className="w-2/3 h-3" />
                  </div>
                </div>
              </div>
            ))}
        </motion.div>

        {/* Backend Unavailable Error State */}
        {error && videoList.length === 0 && (
          <div className="py-14 px-6 text-center space-y-5 max-w-lg mx-auto bg-destructive/5 border border-destructive/20 rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-xl text-foreground">
                Backend Service Unavailable
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We are experiencing difficulty connecting to the BuzzClips API servers. Video feeds are temporarily unreachable.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => refetch()}
                className="gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Connection
              </Button>
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link href="/status">
                  <Activity className="w-3.5 h-3.5" />
                  System Status
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/tv">Watch Live TV</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Empty Search Results */}
        {!isLoading && !error && videoList.length === 0 && (
          <div className="py-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground/60 border border-border/50">
              <Film className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-foreground">
                {t("explore.noVideosFound")}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {isFiltered
                  ? t("explore.noVideosDesc")
                  : t("explore.noPublicVideos")}
              </p>
            </div>
            {isFiltered && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleClearSearch();
                  setActiveCategory("ALL");
                  setActiveTag("");
                }}
              >
                {t("explore.clearFilters")}
              </Button>
            )}
          </div>
        )}

        <div ref={observerRef} className="h-1" />

        {!hasNextPage && videoList.length > 0 && (
          <p className="text-center text-muted-foreground py-6 text-sm">
            {t("explore.endOfList")}
          </p>
        )}
      </div>
    </div>
  );
}
