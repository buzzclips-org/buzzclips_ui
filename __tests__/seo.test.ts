/**
 * @jest-environment node
 */

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import manifest from "@/app/manifest";
import { GET as oembedHandler } from "@/app/api/oembed/route";
import { getVideoBySlug } from "@/utility/requests";

jest.mock("@/utility/requests", () => ({
  getVideoBySlug: jest.fn(),
  getVideoById: jest.fn(),
}));

describe("SEO & Indexing Infrastructure", () => {
  describe("app/robots.ts", () => {
    it("returns compliant robots rules and sitemap links", () => {
      const robotsConfig = robots();

      expect(robotsConfig.host).toBe("https://buzzclips.app");
      expect(robotsConfig.sitemap).toContain(
        "https://buzzclips.app/sitemap.xml"
      );
      expect(robotsConfig.sitemap).toContain(
        "https://buzzclips.app/video-sitemap.xml"
      );

      const rules = Array.isArray(robotsConfig.rules)
        ? robotsConfig.rules
        : [robotsConfig.rules];

      // Verify Googlebot-Video is specifically accounted for
      const botRule = rules.find(
        (r) =>
          Array.isArray(r.userAgent) && r.userAgent.includes("Googlebot-Video")
      );
      expect(botRule).toBeDefined();
      expect(botRule?.allow).toContain("/watch/*");
      expect(botRule?.disallow).toContain("/my-videos");
    });
  });

  describe("app/manifest.ts", () => {
    it("positions the app as an editor and exposes editor/explore shortcuts", () => {
      const m = manifest();
      expect(m.name).toContain("Video Editor");
      expect(m.start_url).toBe("/");
      expect(m.shortcuts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "Video Editor", url: "/" }),
          expect.objectContaining({ name: "Explore Videos", url: "/explore" }),
        ])
      );
    });
  });

  describe("app/sitemap.ts", () => {
    const originalFetch = global.fetch;

    afterAll(() => {
      global.fetch = originalFetch;
    });

    it("includes core static pages and video pages", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              videoId: 1,
              slug: "awesome-video",
              videoStatus: "COMPLETED",
              visibility: "PUBLIC",
              video_uploadDate: "2026-01-01T00:00:00Z",
            },
            {
              videoId: 2,
              slug: "private-video",
              videoStatus: "COMPLETED",
              visibility: "PRIVATE", // should be excluded
            },
          ],
        }),
      });

      const sitemapEntries = await sitemap();

      expect(sitemapEntries.some((e) => e.url === "https://buzzclips.app")).toBe(
        true
      );
      expect(
        sitemapEntries.some(
          (e) => e.url === "https://buzzclips.app/tv/dd-sports"
        )
      ).toBe(true);
      expect(
        sitemapEntries.some(
          (e) => e.url === "https://buzzclips.app/watch/awesome-video"
        )
      ).toBe(true);
      expect(
        sitemapEntries.some(
          (e) => e.url === "https://buzzclips.app/watch/private-video"
        )
      ).toBe(false);

      // Home (video editor) stays top priority; explore feed is daily at 0.9
      const home = sitemapEntries.find((e) => e.url === "https://buzzclips.app");
      expect(home?.priority).toBe(1.0);
      const explore = sitemapEntries.find(
        (e) => e.url === "https://buzzclips.app/explore"
      );
      expect(explore?.changeFrequency).toBe("daily");
      expect(explore?.priority).toBe(0.9);
    });
    it("handles missing slug, missing uploadDate, and error fallbacks in sitemap", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              videoId: 777,
              videoStatus: undefined, // test !v.videoStatus branch
              visibility: "PUBLIC",
              video_uploadDate: null, // test fallback to new Date()
            },
          ],
        }),
      });

      const sitemapEntries = await sitemap();
      expect(
        sitemapEntries.some((e) => e.url === "https://buzzclips.app/watch/777")
      ).toBe(true);

      // Test res.ok = false
      global.fetch = jest.fn().mockResolvedValue({ ok: false });
      const fallbackEntries = await sitemap();
      expect(fallbackEntries.length).toBeGreaterThan(0);

      // Test fetch exception
      global.fetch = jest.fn().mockRejectedValue(new Error("Network failure"));
      const caughtEntries = await sitemap();
      expect(caughtEntries.length).toBeGreaterThan(0);
    });
  });

  describe("app/api/oembed/route.ts", () => {
    it("returns 400 when url param is missing", async () => {
      const req = new Request("https://buzzclips.app/api/oembed");
      const res = await oembedHandler(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Missing required 'url' parameter");
    });

    it("returns valid oEmbed video object when video is found", async () => {
      (getVideoBySlug as jest.Mock).mockResolvedValue({
        videoId: 99,
        video_title: "How to Code",
        slug: "how-to-code",
        thumbnail_url: "https://buzzclips.app/thumb.jpg",
        video_uploader: {
          userId: "dev_1",
          user_name: "Coder",
        },
      });

      const req = new Request(
        "https://buzzclips.app/api/oembed?url=https%3A%2F%2Fbuzzclips.app%2Fwatch%2Fhow-to-code&maxwidth=800&maxheight=450"
      );
      const res = await oembedHandler(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.type).toBe("video");
      expect(json.title).toBe("How to Code");
      expect(json.author_name).toBe("Coder");
      expect(json.provider_name).toBe("BuzzClips");
      expect(json.width).toBe(1280);
      expect(json.height).toBe(720);
      expect(json.html).toContain("<iframe");
      expect(json.html).toContain("/embed/how-to-code");
    });

    it("resolves numeric id via getVideoById", async () => {
      const { getVideoById } = await import("@/utility/requests");
      (getVideoById as jest.Mock).mockResolvedValue({
        videoId: 555,
        video_title: "Numeric Video",
        video_uploader: null,
      });

      const req = new Request(
        "https://buzzclips.app/api/oembed?url=https%3A%2F%2Fbuzzclips.app%2Fwatch%2F555"
      );
      const res = await oembedHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.title).toBe("Numeric Video");
      expect(json.author_name).toBe("BuzzClips Creator");
    });

    it("returns 404 when url format is unrecognized or invalid", async () => {
      const req = new Request(
        "https://buzzclips.app/api/oembed?url=https%3A%2F%2Fotherdomain.com%2Funknown"
      );
      const res = await oembedHandler(req);
      expect(res.status).toBe(404);
    });

    it("returns 404 when video cannot be resolved", async () => {
      (getVideoBySlug as jest.Mock).mockRejectedValue(new Error("Not found"));

      const req = new Request(
        "https://buzzclips.app/api/oembed?url=https%3A%2F%2Fbuzzclips.app%2Fwatch%2Fnon-existent"
      );
      const res = await oembedHandler(req);

      expect(res.status).toBe(404);
    });
  });

  describe("utility/seo.ts", () => {
    const {
      formatToIsoDuration,
      generateWebSiteSchema,
      generateOrganizationSchema,
      generateSiteNavigationSchema,
      generateSoftwareApplicationSchema,
      generateVideoEditorSchema,
      generateVideoEditorHowToSchema,
      generateVideoEditorFaqSchema,
      VIDEO_EDITOR_FEATURES,
      VIDEO_EDITOR_HOW_TO_STEPS,
      VIDEO_EDITOR_FAQS,
      generateFaqSchema,
      generateBreadcrumbSchema,
      generateVideoJsonLd,
      SITE_URL,
    } = require("@/utility/seo");

    it("verifies SITE_URL defaults to buzzclips.app", () => {
      expect(SITE_URL).toBe("https://buzzclips.app");
    });

    describe("formatToIsoDuration", () => {
      it("returns undefined for empty, null, or invalid inputs", () => {
        expect(formatToIsoDuration()).toBeUndefined();
        expect(formatToIsoDuration(null)).toBeUndefined();
        expect(formatToIsoDuration("")).toBeUndefined();
        expect(formatToIsoDuration("invalid-format")).toBeUndefined();
        expect(formatToIsoDuration(-10)).toBeUndefined();
      });

      it("preserves already valid ISO 8601 duration strings", () => {
        expect(formatToIsoDuration("PT2M30S")).toBe("PT2M30S");
        expect(formatToIsoDuration("pt45s")).toBe("PT45S");
        expect(formatToIsoDuration("PT1H30M0S")).toBe("PT1H30M0S");
      });

      it("converts numeric seconds to ISO 8601", () => {
        expect(formatToIsoDuration(45)).toBe("PT45S");
        expect(formatToIsoDuration(90)).toBe("PT1M30S");
        expect(formatToIsoDuration(3665)).toBe("PT1H1M5S");
      });

      it("converts MM:SS strings to ISO 8601", () => {
        expect(formatToIsoDuration("03:25")).toBe("PT3M25S");
        expect(formatToIsoDuration("0:45")).toBe("PT45S");
      });

      it("converts HH:MM:SS strings to ISO 8601", () => {
        expect(formatToIsoDuration("01:10:05")).toBe("PT1H10M5S");
      });

      it("converts raw numeric string to ISO 8601", () => {
        expect(formatToIsoDuration("120")).toBe("PT2M");
      });
    });

    describe("Schema Generators", () => {
      it("generates WebSite schema with SearchAction", () => {
        const schema = generateWebSiteSchema();
        expect(schema["@type"]).toBe("WebSite");
        expect(schema.potentialAction["@type"]).toBe("SearchAction");
        expect(schema.potentialAction.target.urlTemplate).toContain("?query=");
      });

      it("generates Organization schema with social signals", () => {
        const schema = generateOrganizationSchema();
        expect(schema["@type"]).toBe("Organization");
        expect(schema.name).toBe("BuzzClips");
        expect(schema.sameAs).toBeDefined();
        expect(schema.logo.url).toMatch(/icon-512\.png|favicon\.ico/);
      });

      it("generates BreadcrumbList schema accurately", () => {
        const items = [
          { name: "Home", url: "https://buzzclips.app" },
          { name: "Tech", url: "https://buzzclips.app/?category=TECH" },
          { name: "My Video", url: "https://buzzclips.app/watch/my-video" },
        ];
        const schema = generateBreadcrumbSchema(items);
        expect(schema["@type"]).toBe("BreadcrumbList");
        expect(schema.itemListElement).toHaveLength(3);
        expect(schema.itemListElement[0].position).toBe(1);
        expect(schema.itemListElement[2].name).toBe("My Video");
      });

      it("generates VideoObject schema with full metadata", () => {
        const mockVideo = {
          videoId: 123,
          video_title: "Full Stack Tutorial",
          slug: "full-stack-tutorial",
          description: "Learn full stack web development",
          thumbnail_url: "https://buzzclips.app/thumb.png",
          video_uploadDate: "2026-05-01T12:00:00Z",
          video_views: 5000,
          video_duration: "10:30",
          m3u8Url: "https://buzzclips.app/master.m3u8",
          tags: ["coding", "react", "nextjs"],
          video_uploader: {
            userId: "user_42",
            user_name: "LeadDev",
          },
        };

        const schema = generateVideoJsonLd(mockVideo);
        expect(schema["@type"]).toBe("VideoObject");
        expect(schema.name).toBe("Full Stack Tutorial");
        expect(schema.description).toBe("Learn full stack web development");
        expect(schema.duration).toBe("PT10M30S");
        expect(schema.keywords).toBe("coding, react, nextjs");
        expect(schema.author.name).toBe("LeadDev");
        expect(schema.author.url).toContain("/profile/user_42");
        expect(schema.embedUrl).toContain("/embed/full-stack-tutorial");
        expect(schema.interactionStatistic.userInteractionCount).toBe(5000);
      });

      it("handles fallback defaults in VideoObject schema", () => {
        const minimalVideo = {
          videoId: 999,
          video_title: "",
          video_uploadDate: null,
          video_views: 0,
        };

        const schema = generateVideoJsonLd(minimalVideo as any);
        expect(schema.name).toBe("Watch Video");
        expect(schema.thumbnailUrl[0]).toContain("favicon.ico");
        expect(schema.author.name).toBe("BuzzClips Creator");
        expect(schema.duration).toBeUndefined();
      });

      it("generates SiteNavigationElement schema with valid nav items", () => {
        const schema = generateSiteNavigationSchema();
        expect(schema["@context"]).toBe("https://schema.org");
        expect(schema["@graph"]).toBeInstanceOf(Array);
        expect(schema["@graph"].length).toBeGreaterThan(0);
        expect(schema["@graph"][0]["@type"]).toBe("SiteNavigationElement");
        expect(schema["@graph"][0].url).toBe("https://buzzclips.app");
        expect(schema["@graph"][0].name).toBe("Free Online Video Editor");
        expect(
          schema["@graph"].some(
            (item: { url: string }) => item.url === "https://buzzclips.app/explore"
          )
        ).toBe(true);
      });

      it("points the WebSite SearchAction at the explore feed", () => {
        const schema = generateWebSiteSchema();
        expect(schema.potentialAction.target.urlTemplate).toBe(
          "https://buzzclips.app/explore?query={search_term_string}"
        );
      });

      it("generates video editor WebApplication schema", () => {
        const schema = generateVideoEditorSchema();
        expect(schema["@type"]).toContain("WebApplication");
        expect(schema["@type"]).toContain("SoftwareApplication");
        expect(schema["@id"]).toBe("https://buzzclips.app/#video-editor");
        expect(schema.url).toBe("https://buzzclips.app");
        expect(schema.applicationCategory).toBe("MultimediaApplication");
        expect(schema.offers.price).toBe("0");
        expect(schema.isAccessibleForFree).toBe(true);
        expect(schema.featureList).toBe(VIDEO_EDITOR_FEATURES);
        expect(schema.featureList.length).toBeGreaterThan(10);
        expect(schema).not.toHaveProperty("aggregateRating");

        const custom = generateVideoEditorSchema("https://example.com");
        expect(custom.url).toBe("https://example.com");
        expect(custom.publisher["@id"]).toBe("https://example.com/#organization");
      });

      it("generates HowTo schema for editing a video", () => {
        const schema = generateVideoEditorHowToSchema();
        expect(schema["@type"]).toBe("HowTo");
        expect(schema.step).toHaveLength(VIDEO_EDITOR_HOW_TO_STEPS.length);
        expect(schema.step[0]).toMatchObject({
          "@type": "HowToStep",
          position: 1,
          name: VIDEO_EDITOR_HOW_TO_STEPS[0].name,
          url: "https://buzzclips.app/#how-to-step-1",
        });
        expect(schema.estimatedCost.value).toBe("0");
      });

      it("generates video editor FAQPage schema matching visible FAQs", () => {
        const schema = generateVideoEditorFaqSchema();
        expect(schema["@type"]).toBe("FAQPage");
        expect(schema.mainEntity).toHaveLength(VIDEO_EDITOR_FAQS.length);
        expect(schema.mainEntity[0].name).toBe(VIDEO_EDITOR_FAQS[0].question);
        expect(schema.mainEntity[0].acceptedAnswer.text).toBe(
          VIDEO_EDITOR_FAQS[0].answer
        );
      });

      it("generates WebApplication schema with applicationCategory and offers", () => {
        const schema = generateSoftwareApplicationSchema();
        expect(schema["@type"]).toBe("WebApplication");
        expect(schema.name).toBe("BuzzClips");
        expect(schema.applicationCategory).toBe("MultimediaApplication");
        expect(schema.offers.price).toBe("0");
        expect(schema.featureList).toBeInstanceOf(Array);
        expect(
          schema.featureList.some((f: string) => f.includes("Video Editor"))
        ).toBe(true);
      });

      it("generates FAQPage schema with questions and accepted answers", () => {
        const schema = generateFaqSchema();
        expect(schema["@type"]).toBe("FAQPage");
        expect(schema.mainEntity).toBeInstanceOf(Array);
        expect(schema.mainEntity.length).toBeGreaterThan(0);
        expect(schema.mainEntity[0]["@type"]).toBe("Question");
        expect(schema.mainEntity[0].name).toContain("BuzzClips");
        expect(schema.mainEntity[0].acceptedAnswer["@type"]).toBe("Answer");
      });
    });

    describe("constants/seoKeywords.ts", () => {
      it("exports comprehensive SEO buzzwords including Indian TV and video streaming terms", async () => {
        const { SEO_KEYWORD_GROUPS, ALL_SEO_BUZZWORDS, POPULAR_SEO_TOPICS } =
          await import("@/constants/seoKeywords");

        // Verify Indian TV buzzwords
        expect(SEO_KEYWORD_GROUPS.INDIAN_TV).toContain("indian tv");
        expect(SEO_KEYWORD_GROUPS.INDIAN_TV).toContain("free indian tv");
        expect(SEO_KEYWORD_GROUPS.INDIAN_TV).toContain("watch indian tv online free");
        expect(SEO_KEYWORD_GROUPS.INDIAN_TV).toContain("dd sports live streaming");

        // Verify Video Streaming buzzwords
        expect(SEO_KEYWORD_GROUPS.VIDEO_STREAMING_PLATFORM).toContain("video streaming website");
        expect(SEO_KEYWORD_GROUPS.VIDEO_STREAMING_PLATFORM).toContain("free video streaming");

        // Verify Hindi Regional buzzwords
        expect(SEO_KEYWORD_GROUPS.HINDI_REGIONAL).toContain("फ्री इंडियन टीवी");
        expect(SEO_KEYWORD_GROUPS.HINDI_REGIONAL).toContain("लाइव टीवी भारत");

        // Verify Brand Permutations & Combinations
        expect(SEO_KEYWORD_GROUPS.BRAND_AND_OFFICIAL).toContain("buzz clips");
        expect(SEO_KEYWORD_GROUPS.BRAND_AND_OFFICIAL).toContain("buzz clip");
        expect(SEO_KEYWORD_GROUPS.BRAND_AND_OFFICIAL).toContain("buzzclip");
        expect(SEO_KEYWORD_GROUPS.BRAND_AND_OFFICIAL).toContain("buzzclips");
        expect(SEO_KEYWORD_GROUPS.BRAND_AND_OFFICIAL).toContain("buzz clips tv");
        expect(SEO_KEYWORD_GROUPS.BRAND_AND_OFFICIAL).toContain("buzzclip tv");
        expect(SEO_KEYWORD_GROUPS.BRAND_AND_OFFICIAL).toContain("buzz clips app");
        expect(SEO_KEYWORD_GROUPS.BRAND_AND_OFFICIAL).toContain("buzzclip app");
        expect(SEO_KEYWORD_GROUPS.BRAND_AND_OFFICIAL).toContain("buzz clips reels");
        expect(SEO_KEYWORD_GROUPS.BRAND_AND_OFFICIAL).toContain("buzzclip reels");

        // Verify Creative Works and Media Formats
        expect(SEO_KEYWORD_GROUPS.CREATIVE_WORKS_AND_FORMATS).toContain("web series free online");
        expect(SEO_KEYWORD_GROUPS.CREATIVE_WORKS_AND_FORMATS).toContain("short films online");
        expect(SEO_KEYWORD_GROUPS.CREATIVE_WORKS_AND_FORMATS).toContain("video podcasts online");

        // Verify ALL_SEO_BUZZWORDS
        expect(ALL_SEO_BUZZWORDS.length).toBeGreaterThan(50);
        expect(ALL_SEO_BUZZWORDS).toContain("buzz clips");
        expect(ALL_SEO_BUZZWORDS).toContain("buzz clip");
        expect(ALL_SEO_BUZZWORDS).toContain("buzzclip");
        expect(ALL_SEO_BUZZWORDS).toContain("free indian tv");
        expect(ALL_SEO_BUZZWORDS).toContain("video streaming website");
        expect(ALL_SEO_BUZZWORDS).toContain("free online video editor");

        // Verify video editor keyword set
        const { VIDEO_EDITOR_SEO_KEYWORDS } = await import("@/constants/seoKeywords");
        expect(VIDEO_EDITOR_SEO_KEYWORDS).toBe(SEO_KEYWORD_GROUPS.VIDEO_EDITOR);
        for (const kw of [
          "free online video editor",
          "video editor online no watermark",
          "trim video online",
          "merge videos online",
          "crop video online",
          "add text to video",
          "add music to video",
          "mp4 editor",
          "browser video editor",
        ]) {
          expect(VIDEO_EDITOR_SEO_KEYWORDS).toContain(kw);
          expect(ALL_SEO_BUZZWORDS).toContain(kw);
        }
        expect(new Set(ALL_SEO_BUZZWORDS).size).toBe(ALL_SEO_BUZZWORDS.length);

        // Verify POPULAR_SEO_TOPICS
        expect(POPULAR_SEO_TOPICS.length).toBeGreaterThan(10);
        expect(POPULAR_SEO_TOPICS.some((t) => t.url === "/tv")).toBe(true);
        expect(POPULAR_SEO_TOPICS.some((t) => t.name === "Free Indian TV")).toBe(true);
        expect(POPULAR_SEO_TOPICS.some((t) => t.name === "Web Series & Short Films")).toBe(true);
        expect(
          POPULAR_SEO_TOPICS.some((t) => t.url === "/" && t.category === "editor")
        ).toBe(true);
        expect(
          POPULAR_SEO_TOPICS.find((t) => t.name === "Free Video Streaming")?.url
        ).toBe("/explore");

        // Verify generateBrandPermutations helper
        const { generateBrandPermutations } = await import("@/constants/seoKeywords");
        const perms = generateBrandPermutations("live tv");
        expect(perms).toContain("buzzclips live tv");
        expect(perms).toContain("buzz clips live tv");
        expect(perms).toContain("buzzclip live tv");
        expect(perms).toContain("buzz clip live tv");
      });

      it("generates targeted channel FAQ and brand schemas", async () => {
        const {
          generateSingleChannelFaqSchema,
          generateWebSiteSchema,
          generateOrganizationSchema,
        } = await import("@/utility/seo");
        const { ALL_LIVE_CHANNELS } = await import("@/constants/liveChannels");

        const ddSports = ALL_LIVE_CHANNELS.find((c) => c.id === "dd-sports")!;
        const faq = generateSingleChannelFaqSchema(ddSports, "https://buzzclips.app");

        expect(faq["@type"]).toBe("FAQPage");
        expect(faq.mainEntity.length).toBeGreaterThanOrEqual(4);
        expect(
          faq.mainEntity.some((q) =>
            q.name.includes("DD Sports live streaming")
          )
        ).toBe(true);
        expect(
          faq.mainEntity.some((q) =>
            q.acceptedAnswer.text.includes("Indian national cricket matches")
          )
        ).toBe(true);

        const websiteSchema = generateWebSiteSchema("https://buzzclips.app");
        expect(websiteSchema.alternateName).toContain("Buzz Clips");
        expect(websiteSchema.brand.alternateName).toContain("Buzz Clips");

        const orgSchema = generateOrganizationSchema("https://buzzclips.app");
        expect(orgSchema.alternateName).toContain("Buzz Clips");
        expect(orgSchema.brand.alternateName).toContain("Buzz Clips");
      });
    });
  });
});


