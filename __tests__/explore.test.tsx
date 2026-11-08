import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ExploreClient, { CATEGORIES } from "@/components/explore/ExploreClient";
import { generateMetadata as generateCategoryMetadata } from "@/app/category/[category]/page";
import { generateMetadata as generateTagMetadata } from "@/app/tag/[tag]/page";
import { VideoDTO } from "@/types/video";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(""),
  }),
}));

// Mock requests
jest.mock("@/utility/requests", () => ({
  fetchVideos: jest.fn().mockResolvedValue({
    content: [],
    last: true,
    number: 0,
    totalElements: 0,
    totalPages: 0,
    size: 12,
  }),
  searchVideos: jest.fn().mockResolvedValue({
    content: [],
    last: true,
    number: 0,
    totalElements: 0,
    totalPages: 0,
    size: 12,
  }),
}));

describe("ExploreClient & SEO Category/Tag Routes", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    mockPush.mockClear();

    // Mock IntersectionObserver
    window.IntersectionObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  });

  const mockVideos: VideoDTO[] = [
    {
      videoId: 101,
      video_title: "Next.js 15 Masterclass",
      slug: "nextjs-15-masterclass",
      description: "Learn Next.js 15 App Router",
      thumbnail_url: "https://buzzclips.app/thumb1.jpg",
      video_uploadDate: "2026-03-01T12:00:00Z",
      video_views: 1200,
      videoStatus: "COMPLETED",
      visibility: "PUBLIC",
      tags: ["nextjs", "react"],
    },
    {
      videoId: 102,
      video_title: "Apex Legends Highlights",
      slug: "apex-legends-highlights",
      description: "Epic gaming moments",
      thumbnail_url: "https://buzzclips.app/thumb2.jpg",
      video_uploadDate: "2026-03-02T12:00:00Z",
      video_views: 4500,
      videoStatus: "COMPLETED",
      visibility: "PUBLIC",
      tags: ["gaming", "apex"],
    },
  ];

  it("renders initial videos directly without showing empty skeleton", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ExploreClient initialVideos={mockVideos} />
      </QueryClientProvider>
    );

    expect(screen.getByText("Next.js 15 Masterclass")).toBeInTheDocument();
    expect(screen.getByText("Apex Legends Highlights")).toBeInTheDocument();
    expect(
      screen.getByText(/BuzzClips \(Buzz Clips\) - Explore/i)
    ).toBeInTheDocument();
  });

  it("navigates to category route when clicking a category pill", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ExploreClient initialVideos={mockVideos} />
      </QueryClientProvider>
    );

    const techPill = screen.getByRole("button", { name: "Tech" });
    fireEvent.click(techPill);

    expect(mockPush).toHaveBeenCalledWith("/category/tech");
  });

  it("navigates to root when clicking All category pill", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ExploreClient initialVideos={mockVideos} defaultCategory="TECH" />
      </QueryClientProvider>
    );

    const allPill = screen.getByRole("button", { name: "All" });
    fireEvent.click(allPill);

    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("generates correct metadata for category pages", async () => {
    const meta = await generateCategoryMetadata({
      params: Promise.resolve({ category: "gaming" }),
    });

    expect(meta.title).toContain("Gaming Highlights");
    expect(meta.description).toContain("gaming highlights");
    expect(meta.alternates?.canonical).toBe("https://buzzclips.app/category/gaming");
  });

  it("generates correct metadata for tag pages", async () => {
    const meta = await generateTagMetadata({
      params: Promise.resolve({ tag: "typescript" }),
    });

    expect(meta.title).toContain("#typescript");
    expect(meta.alternates?.canonical).toBe("https://buzzclips.app/tag/typescript");
  });

  it("handles unknown category gracefully", async () => {
    const meta = await generateCategoryMetadata({
      params: Promise.resolve({ category: "unknown-xyz" }),
    });

    expect(meta.title).toContain("Category Not Found");
  });

  it("renders backend unavailable card when API query fails", async () => {
    const requestsMock = jest.requireMock("@/utility/requests");
    requestsMock.fetchVideos.mockRejectedValueOnce(new Error("Backend unreachable"));

    const failingClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={failingClient}>
        <ExploreClient initialVideos={[]} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Backend Service Unavailable")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Retry Connection/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /System Status/i })).toBeInTheDocument();
    });
  });
});
