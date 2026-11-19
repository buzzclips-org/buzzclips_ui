import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { searchVideos } from "@/utility/requests";
import { SITE_URL, generateBreadcrumbSchema, serializeJsonLd } from "@/utility/seo";
import { VideoDTO } from "@/types/video";
import ExploreClient from "@/components/explore/ExploreClient";
import { Skeleton } from "@/components/ui/skeleton";

export const revalidate = 60;

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

const CATEGORY_MAP: Record<
  string,
  { label: string; value: string; description: string }
> = {
  tech: {
    label: "Tech & Coding",
    value: "TECH",
    description:
      "Explore the latest tech tutorials, software development insights, AI breakthroughs, and engineering clips on BuzzClips.",
  },
  education: {
    label: "Education & Learning",
    value: "EDUCATION",
    description:
      "Educational videos, science explainers, masterclasses, and in-depth learning resources created by top instructors on BuzzClips.",
  },
  gaming: {
    label: "Gaming Highlights",
    value: "GAMING",
    description:
      "Watch gaming highlights, esports clips, walkthroughs, reviews, and epic live moments on BuzzClips.",
  },
  entertainment: {
    label: "Entertainment & Comedy",
    value: "ENTERTAINMENT",
    description:
      "Stream viral clips, comedy skits, creative shorts, and community entertainment on BuzzClips.",
  },
  music: {
    label: "Music & Beats",
    value: "MUSIC",
    description:
      "Discover music videos, original audio tracks, live acoustic sessions, and beat showcases on BuzzClips.",
  },
  news: {
    label: "News & Commentary",
    value: "NEWS",
    description:
      "Stay informed with curated news commentary, technology updates, and world headlines on BuzzClips.",
  },
  sports: {
    label: "Sports & Fitness",
    value: "SPORTS",
    description:
      "Catch sports highlights, fitness routines, athletic achievements, and game breakdowns on BuzzClips.",
  },
  lifestyle: {
    label: "Lifestyle & Vlogs",
    value: "LIFESTYLE",
    description:
      "Vlogs, travel stories, creative lifestyle routines, and daily inspiration from creator communities on BuzzClips.",
  },
  other: {
    label: "Community Videos",
    value: "OTHER",
    description:
      "Explore diverse creator videos, experimental content, and community uploads on BuzzClips.",
  },
};

export async function generateStaticParams() {
  return Object.keys(CATEGORY_MAP).map((cat) => ({
    category: cat,
  }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const catKey = category.toLowerCase();
  const catInfo = CATEGORY_MAP[catKey];

  if (!catInfo) {
    return {
      title: "Category Not Found | BuzzClips",
      description: "Browse trending video categories on BuzzClips.",
    };
  }

  const title = `${catInfo.label} Videos & Clips | BuzzClips`;
  const canonicalUrl = `${SITE_URL}/category/${catKey}`;

  return {
    title,
    description: catInfo.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description: catInfo.description,
      url: canonicalUrl,
      type: "website",
      images: [
        {
          url: `${SITE_URL}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${catInfo.label} on BuzzClips`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: catInfo.description,
      images: [`${SITE_URL}/opengraph-image`],
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const catKey = category.toLowerCase();
  const catInfo = CATEGORY_MAP[catKey];

  if (!catInfo) {
    notFound();
  }

  let initialPage = null;
  let initialVideos: VideoDTO[] = [];

  try {
    initialPage = await searchVideos({
      category: catInfo.value,
      page: 0,
      size: 12,
    });
    initialVideos = (initialPage?.content || []).filter(
      (v: VideoDTO) =>
        (v.videoStatus === "COMPLETED" || !v.videoStatus) &&
        v.visibility !== "PRIVATE"
    );
  } catch (err) {
    console.error(`Failed to fetch category videos for ${catInfo.value}:`, err);
  }

  // Breadcrumbs schema
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: SITE_URL },
    { name: catInfo.label, url: `${SITE_URL}/category/${catKey}` },
  ]);

  // ItemList schema
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${catInfo.label} Videos on BuzzClips`,
    itemListElement: initialVideos.map((video, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}/watch/${video.slug || video.videoId}`,
      name: video.video_title,
      description: video.description || `Watch ${video.video_title} on BuzzClips`,
      image: video.thumbnail_url || `${SITE_URL}/favicon.ico`,
    })),
  };

  return (
    <>
      <script
        id="category-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }}
      />
      {initialVideos.length > 0 && (
        <script
          id="category-itemlist-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListSchema) }}
        />
      )}

      {/* Crawlable noscript fallback */}
      {initialVideos.length > 0 && (
        <noscript>
          <div className="sr-only">
            <h2>{catInfo.label} Videos on BuzzClips</h2>
            <p>{catInfo.description}</p>
            <ul>
              {initialVideos.map((video) => (
                <li key={video.videoId}>
                  <a href={`/watch/${video.slug || video.videoId}`}>
                    {video.video_title}
                  </a>
                  <p>{video.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </noscript>
      )}

      <Suspense
        fallback={
          <div className="w-full max-w-full overflow-x-hidden flex justify-center py-6">
            <div className="w-full max-w-full lg:max-w-[85%] px-4 space-y-6 min-w-0">
              <Skeleton className="h-10 w-48" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="w-full aspect-video rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        }
      >
        <ExploreClient
          initialVideos={initialVideos}
          initialPage={initialPage}
          defaultCategory={catInfo.value}
        />
      </Suspense>
    </>
  );
}
