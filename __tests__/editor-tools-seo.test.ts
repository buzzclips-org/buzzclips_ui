import { EDITOR_TOOLS, getEditorTool } from "@/constants/editorTools";
import {
  generateFaqPageSchema,
  generateHreflangAlternates,
  hreflangSitemapLinks,
} from "@/utility/seo";

describe("editor tool landing pages", () => {
  it("has unique slugs and valid internal links", () => {
    const slugs = EDITOR_TOOLS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const tool of EDITOR_TOOLS) {
      for (const r of tool.related) {
        expect(slugs).toContain(r);
        expect(r).not.toBe(tool.slug);
      }
    }
  });

  it("keeps metadata within search-snippet limits", () => {
    for (const tool of EDITOR_TOOLS) {
      expect(tool.title.length).toBeLessThanOrEqual(45);
      expect(tool.description.length).toBeGreaterThanOrEqual(120);
      expect(tool.description.length).toBeLessThanOrEqual(160);
      expect(tool.steps.length).toBeGreaterThanOrEqual(3);
      expect(tool.faqs.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("has unique titles and descriptions (no duplicate pages)", () => {
    expect(new Set(EDITOR_TOOLS.map((t) => t.title)).size).toBe(EDITOR_TOOLS.length);
    expect(new Set(EDITOR_TOOLS.map((t) => t.description)).size).toBe(EDITOR_TOOLS.length);
  });

  it("looks tools up by slug", () => {
    expect(getEditorTool("trim-video")?.name).toBeTruthy();
    expect(getEditorTool("does-not-exist")).toBeUndefined();
  });
});

describe("seo helpers", () => {
  it("builds FAQPage schema from visible FAQs", () => {
    const schema = generateFaqPageSchema([{ question: "Q?", answer: "A." }]);
    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity[0]).toEqual({
      "@type": "Question",
      name: "Q?",
      acceptedAnswer: { "@type": "Answer", text: "A." },
    });
  });

  it("emits escaped hreflang sitemap links matching the metadata alternates", () => {
    const xml = hreflangSitemapLinks('https://buzzclips.app/watch/a?b=1&c="<x>"');
    expect(xml.split("\n")).toHaveLength(Object.keys(generateHreflangAlternates("https://x")).length);
    expect(xml).toContain('hreflang="x-default"');
    expect(xml).toContain('href="https://buzzclips.app/watch/a"');
    expect(xml).not.toContain("?hl=");
    const escaped = hreflangSitemapLinks("https://buzzclips.app/a&b\"<>", "");
    expect(escaped).toContain("a&amp;b&quot;&lt;&gt;");
    expect(escaped.startsWith("<xhtml:link")).toBe(true);
  });
});
