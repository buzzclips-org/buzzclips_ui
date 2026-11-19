import React from "react";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import {
  LanguageProvider,
  useLanguage,
} from "@/store/language-context";
import { LanguageSwitcher } from "@/components/partials/LanguageSwitcher";
import { LanguageNoticeBanner } from "@/components/partials/LanguageNoticeBanner";
import { SUPPORTED_LANGUAGES, isValidLocale } from "@/constants/locales";
import { getTranslation } from "@/constants/translations";
import { generateHreflangAlternates } from "@/utility/seo";

function TestConsumer() {
  const { locale, setLocale, t, formatNumber, formatDate, isRTL } =
    useLanguage();

  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="home-text">{t("nav.home")}</span>
      <span data-testid="formatted-number">{formatNumber(12345)}</span>
      <span data-testid="formatted-date">
        {formatDate(new Date("2026-01-15T00:00:00Z"))}
      </span>
      <span data-testid="is-rtl">{String(isRTL)}</span>
      <button onClick={() => setLocale("hi")}>Switch to Hindi</button>
      <button onClick={() => setLocale("ar")}>Switch to Arabic</button>
      <button onClick={() => setLocale("en")}>Switch to English</button>
    </div>
  );
}

describe("Language Context & Switcher", () => {
  beforeEach(() => {
    try {
      localStorage.clear();
      document.cookie = "buzzclips_locale=en; path=/";
    } catch {}
  });

  it("provides default english translations and helpers", () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    expect(screen.getByTestId("locale").textContent).toBe("en");
    expect(screen.getByTestId("home-text").textContent).toBe("Home");
    expect(screen.getByTestId("is-rtl").textContent).toBe("false");
    expect(screen.getByTestId("formatted-number").textContent).toContain("12");
  });

  it("updates locale to Hindi and Arabic when setLocale is called", () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByText("Switch to Hindi"));
    expect(screen.getByTestId("locale").textContent).toBe("hi");
    expect(screen.getByTestId("home-text").textContent).toBe("होम");

    fireEvent.click(screen.getByText("Switch to Arabic"));
    expect(screen.getByTestId("locale").textContent).toBe("ar");
    expect(screen.getByTestId("home-text").textContent).toBe("الرئيسية");
    expect(screen.getByTestId("is-rtl").textContent).toBe("true");

    // Reset back to English
    fireEvent.click(screen.getByText("Switch to English"));
    expect(screen.getByTestId("locale").textContent).toBe("en");
  });

  it("renders LanguageSwitcher dropdown trigger and label", () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher variant="full" />
      </LanguageProvider>
    );

    const trigger = screen.getByRole("button");
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
  });

  it("renders LanguageSwitcher icon variant", () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher variant="icon" />
      </LanguageProvider>
    );

    const trigger = screen.getByRole("button");
    expect(trigger).toBeInTheDocument();
  });

  it("validates locale codes correctly", () => {
    expect(isValidLocale("en")).toBe(true);
    expect(isValidLocale("hi")).toBe(true);
    expect(isValidLocale("es")).toBe(true);
    expect(isValidLocale("xyz")).toBe(false);
  });

  it("getTranslation falls back to English when a key is missing", () => {
    expect(getTranslation("en", "nav.home")).toBe("Home");
    expect(getTranslation("hi", "nav.home")).toBe("होम");
    expect(getTranslation("hi", "nonexistent.key")).toBe("nonexistent.key");
  });

  it("getTranslation interpolates parameters correctly", () => {
    expect(
      getTranslation("en", "playlists.count_one", { count: 1 })
    ).toBe("playlist created");
  });

  it("formats dates and numbers gracefully", () => {
    const { result } = renderHook(() => useLanguage(), {
      wrapper: ({ children }) => <LanguageProvider>{children}</LanguageProvider>,
    });

    expect(result.current.formatNumber(100)).toBeDefined();
    expect(result.current.formatDate(new Date())).toBeDefined();
    expect(result.current.formatDate("invalid-date")).toBeDefined();
  });

  it("contains all 12 supported languages", () => {
    expect(SUPPORTED_LANGUAGES.length).toBe(12);
  });

  it("translates new watch, comments, upload, and auth namespaces across languages", () => {
    expect(getTranslation("en", "watch.views")).toBe("views");
    expect(getTranslation("hi", "watch.views")).toBe("दृश्य");
    expect(getTranslation("bn", "watch.views")).toBe("ভিউ");
    expect(getTranslation("es", "watch.views")).toBe("vistas");
    expect(getTranslation("fr", "watch.views")).toBe("vues");
    expect(getTranslation("de", "watch.views")).toBe("Aufrufe");
    expect(getTranslation("ja", "watch.views")).toBe("回視聴");
    expect(getTranslation("ar", "watch.views")).toBe("مشاهدة");
    expect(getTranslation("ru", "watch.views")).toBe("просмотров");
    expect(getTranslation("pt", "watch.views")).toBe("visualizações");
    expect(getTranslation("te", "watch.views")).toBe("వీక్షణలు");
    expect(getTranslation("ta", "watch.views")).toBe("பார்வைகள்");

    expect(getTranslation("en", "comments.title")).toBe("Comments");
    expect(getTranslation("hi", "comments.title")).toBe("टिप्पणियाँ");
    expect(getTranslation("en", "upload.publishButton")).toBe("Publish Video");
    expect(getTranslation("en", "auth.signInTitle")).toBe("Welcome back to BuzzClips");
  });

  it("generates correct hreflang alternate links for SEO", () => {
    const alternates = generateHreflangAlternates("https://buzzclips.app/watch/clip-123");
    expect(alternates["x-default"]).toBe("https://buzzclips.app/watch/clip-123");
    expect(alternates["en"]).toBe("https://buzzclips.app/watch/clip-123");
    // Content is server-rendered in English only, so no ?hl= variants are advertised.
    expect(alternates["hi"]).toBeUndefined();
    expect(Object.keys(alternates)).toEqual(["x-default", "en"]);
    expect(generateHreflangAlternates("https://buzzclips.app/a?x=1")["en"]).toBe("https://buzzclips.app/a");
  });

  it("renders LanguageNoticeBanner when locale is not English and switches to English on click", () => {
    sessionStorage.clear();

    function BannerTest() {
      const { setLocale } = useLanguage();
      return (
        <div>
          <LanguageNoticeBanner />
          <button onClick={() => setLocale("hi")}>Go Hindi</button>
        </div>
      );
    }

    render(
      <LanguageProvider>
        <BannerTest />
      </LanguageProvider>
    );

    // Default is English, banner is not rendered
    expect(screen.queryByText("Convert to English")).not.toBeInTheDocument();

    // Switch to Hindi
    fireEvent.click(screen.getByText("Go Hindi"));

    // Now banner should be visible
    expect(screen.getByText("Convert to English")).toBeInTheDocument();

    // Clicking Convert to English
    fireEvent.click(screen.getByText("Convert to English"));

    // Banner should be hidden again
    expect(screen.queryByText("Convert to English")).not.toBeInTheDocument();
  });
});
