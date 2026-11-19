import Link from "next/link";
import { EDITOR_TOOLS } from "@/constants/editorTools";
import {
  Scissors,
  Combine,
  Type,
  Music,
  Crop,
  Gauge,
  SlidersHorizontal,
  Download,
  ShieldCheck,
  Undo2,
  Save,
  RotateCw,
  HelpCircle,
  ListOrdered,
  Youtube,
  Instagram,
  Smartphone,
  Film,
  Compass,
  TrendingUp,
  Tv,
  Clapperboard,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { VIDEO_EDITOR_FAQS, VIDEO_EDITOR_HOW_TO_STEPS } from "@/utility/seo";

const FEATURES: { icon: LucideIcon; title: string; text: string; color: string }[] = [
  {
    icon: Scissors,
    title: "Trim, cut & split",
    text: "Trim the start and end of any clip, split at the playhead to cut out mistakes, and reorder, duplicate or delete clips on the timeline.",
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    icon: Combine,
    title: "Merge videos",
    text: "Join multiple video clips and photos into a single MP4. Import as many videos, images and audio files as you need.",
    color: "bg-purple-500/10 text-purple-500",
  },
  {
    icon: Type,
    title: "Add text & titles",
    text: "Place text overlays and titles with their own start time, duration, position, color and size.",
    color: "bg-pink-500/10 text-pink-500",
  },
  {
    icon: Music,
    title: "Add music & control audio",
    text: "Add a background music track with its own volume, mute or adjust the volume of each clip, and fade in or out.",
    color: "bg-amber-500/10 text-amber-500",
  },
  {
    icon: Crop,
    title: "Resize & change aspect ratio",
    text: "Switch between 16:9, 9:16, 1:1 and 4:5, then fit or fill the frame with a background color of your choice.",
    color: "bg-emerald-500/10 text-emerald-500",
  },
  {
    icon: Gauge,
    title: "Change video speed",
    text: "Speed clips up to 4x for time-lapses or slow them down to 0.25x for slow motion, per clip.",
    color: "bg-cyan-500/10 text-cyan-500",
  },
  {
    icon: RotateCw,
    title: "Rotate & flip",
    text: "Fix sideways phone footage by rotating clips, or mirror them horizontally or vertically.",
    color: "bg-orange-500/10 text-orange-500",
  },
  {
    icon: SlidersHorizontal,
    title: "Filters & color",
    text: "Adjust brightness, contrast and saturation, or apply grayscale, sepia and blur.",
    color: "bg-violet-500/10 text-violet-500",
  },
  {
    icon: Download,
    title: "Export MP4 up to 1080p",
    text: "Render an MP4 (H.264/AAC) at 480p, 720p or 1080p and download it. No watermark, ever.",
    color: "bg-sky-500/10 text-sky-500",
  },
  {
    icon: Undo2,
    title: "Undo, redo & shortcuts",
    text: "Experiment freely with undo and redo, and work faster with keyboard shortcuts.",
    color: "bg-rose-500/10 text-rose-500",
  },
  {
    icon: Save,
    title: "Autosave",
    text: "Your project is saved automatically in your browser, so you can pick up where you left off.",
    color: "bg-lime-500/10 text-lime-500",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    text: "Everything runs on your device. Your files are not uploaded unless you choose to publish.",
    color: "bg-teal-500/10 text-teal-500",
  },
];

const USE_CASES: {
  id: string;
  icon: LucideIcon;
  title: string;
  ratio: string;
  text: string;
}[] = [
  {
    id: "youtube-video-editor",
    icon: Youtube,
    title: "YouTube video editor",
    ratio: "16:9",
    text: "Cut together vlogs, tutorials and gaming clips in widescreen 16:9, add titles and background music, and export a 1080p MP4 ready to upload to YouTube.",
  },
  {
    id: "reels-video-editor",
    icon: Instagram,
    title: "Instagram Reels editor",
    ratio: "9:16",
    text: "Switch to the 9:16 vertical preset, trim your best moments, add text and a soundtrack, and export a Reel-ready MP4. Use 1:1 or 4:5 for square and portrait feed posts.",
  },
  {
    id: "shorts-video-editor",
    icon: Smartphone,
    title: "YouTube Shorts editor",
    ratio: "9:16",
    text: "Turn a longer horizontal video into a vertical Short: choose 9:16, pick fit or fill, and trim it down to the highlight.",
  },
  {
    id: "tiktok-video-editor",
    icon: Film,
    title: "TikTok video editor",
    ratio: "9:16",
    text: "Make vertical TikTok videos with speed changes, captions-style text overlays, filters and music, then download the MP4 and post it from your phone or computer.",
  },
];

const EXPLORE_LINKS: { href: string; icon: LucideIcon; label: string; text: string }[] = [
  {
    href: "/explore",
    icon: Compass,
    label: "Explore videos",
    text: "Browse creator uploads and clips from the BuzzClips community.",
  },
  {
    href: "/trending",
    icon: TrendingUp,
    label: "Trending",
    text: "See which videos are popular on BuzzClips right now.",
  },
  {
    href: "/reels",
    icon: Clapperboard,
    label: "Reels & Shorts",
    text: "Swipe through vertical short videos made by creators.",
  },
  {
    href: "/tv",
    icon: Tv,
    label: "Free Live TV",
    text: "Watch official Free-To-Air Indian TV channels live.",
  },
  {
    href: "/video/upload",
    icon: Upload,
    label: "Upload a video",
    text: "Already have a finished video? Upload it to BuzzClips.",
  },
];

export default function EditorSeoContent() {
  return (
    <section
      aria-labelledby="editor-seo-heading"
      className="w-full max-w-full overflow-x-hidden flex justify-center py-12 border-t border-border/40 bg-card/20"
    >
      <div className="w-full max-w-full lg:max-w-[85%] px-4 space-y-14 min-w-0">
        {/* Intro */}
        <div className="space-y-3 max-w-3xl">
          <h2
            id="editor-seo-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
          >
            A free online video editor that runs in your browser
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            BuzzClips is a free video editor you can use straight from your
            browser, with nothing to install. Trim and cut clips, merge
            videos, add text and music, resize for YouTube, Reels, Shorts or
            TikTok, and export an MP4 with no watermark. You don&apos;t need an
            account to edit or export, and your files stay on your device.
          </p>
        </div>

        {/* Features grid */}
        <div className="space-y-5">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Everything you need to edit videos online
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, title, text, color }) => (
              <li
                key={title}
                className="p-5 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xs space-y-2.5"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* How to */}
        <div className="space-y-5" id="how-to-edit-a-video">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-primary" aria-hidden="true" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              How to edit a video online in 4 steps
            </h2>
          </div>
          <ol className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {VIDEO_EDITOR_HOW_TO_STEPS.map((step, index) => (
              <li
                key={step.name}
                id={`how-to-step-${index + 1}`}
                className="p-5 rounded-2xl border border-border/50 bg-card/40 space-y-2.5"
              >
                <span className="inline-flex w-8 h-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  {index + 1}
                </span>
                <h3 className="text-base font-semibold text-foreground">{step.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Use cases */}
        <div className="space-y-5">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Make videos for YouTube, Reels, Shorts and TikTok
          </h2>
          <nav aria-label="Video editor use cases" className="flex flex-wrap gap-2">
            {USE_CASES.map((useCase) => (
              <a
                key={useCase.id}
                href={`#${useCase.id}`}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-card/80 hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border/50 transition-all"
              >
                {useCase.title}
              </a>
            ))}
          </nav>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {USE_CASES.map(({ id, icon: Icon, title, ratio, text }) => (
              <article
                key={id}
                id={id}
                className="p-5 rounded-2xl border border-border/50 bg-card/40 space-y-2.5 scroll-mt-24"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-foreground">{title}</h3>
                  <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                    {ratio}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
              </article>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div className="p-6 rounded-2xl border border-border/50 bg-card/40 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" aria-hidden="true" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Your videos never leave your device
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            Most online video editors upload your footage to a server before
            you can edit it. BuzzClips works differently: decoding, editing and
            MP4 encoding all happen locally in your browser using the WebCodecs
            API. Nothing is sent to us while you edit or export, which also
            means there is no upload to wait for. Your project autosaves in
            your browser&apos;s storage on this device.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            If you are signed in, you can optionally publish the finished video
            to BuzzClips in one click. That is the only time a file is
            uploaded, and only when you choose to. You can also{" "}
            <Link href="/video/upload" prefetch={false} className="text-primary hover:underline">
              upload an existing video
            </Link>{" "}
            directly.
          </p>
        </div>

        {/* FAQ */}
        <div className="space-y-6" id="video-editor-faq">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" aria-hidden="true" />
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Video editor FAQ
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Common questions about editing videos online with BuzzClips.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VIDEO_EDITOR_FAQS.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl border border-border/50 bg-card/50 p-4 transition-all duration-200 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-foreground">
                  <h3 className="font-semibold">{faq.question}</h3>
                  <span
                    aria-hidden="true"
                    className="shrink-0 ml-2 text-primary transition duration-300 group-open:-rotate-180"
                  >
                    ▼
                  </span>
                </summary>
                <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>

        {/* Task-specific tools */}
        <nav aria-label="Free video tools" className="space-y-5">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Free video tools for specific jobs
          </h2>
          <ul className="flex flex-wrap gap-2">
            {EDITOR_TOOLS.map((tool) => (
              <li key={tool.slug}>
                <Link
                  href={`/tools/${tool.slug}`}
                  className="inline-flex items-center rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  {tool.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Internal links */}
        <div className="space-y-5">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            More on BuzzClips
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {EXPLORE_LINKS.map(({ href, icon: Icon, label, text }) => (
              <li key={href}>
                <Link
                  href={href}
                  prefetch={href === "/video/upload" ? false : undefined}
                  className="block h-full p-4 rounded-2xl border border-border/50 bg-card/40 hover:bg-primary/5 hover:border-primary/40 transition-all space-y-1.5"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
                    {label}
                  </span>
                  <span className="block text-xs text-muted-foreground leading-relaxed">
                    {text}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
