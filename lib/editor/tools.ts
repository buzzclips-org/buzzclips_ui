import type { AspectRatio } from "./types";

/** Which inspector panel the editor should highlight for a tool landing page. */
export type ToolPanel = "clip" | "text" | "audio" | "project";

/** Content + editor preset for one SEO landing page at /tools/[slug]. */
export interface EditorTool {
  slug: string;
  /** Short name used in nav/cards, e.g. "Trim Video". */
  name: string;
  /** Visible H1, e.g. "Trim Video Online, Free". */
  h1: string;
  /** <title> without the brand suffix (layout template appends it). ≤ 60 chars incl. brand ideally. */
  title: string;
  /** Meta description, 140–160 chars. */
  description: string;
  /** Primary + secondary keywords for this page. */
  keywords: string[];
  /** One-line value proposition shown under the H1 (≤ 110 chars). */
  tagline: string;
  /** Hint shown inside the editor for this task (≤ 120 chars). */
  editorHint: string;
  /** Editor preset applied to a fresh project. */
  preset: { aspect?: AspectRatio; panel?: ToolPanel };
  /** 2–3 paragraph intro, unique per page (plain text, each item is a paragraph). */
  intro: string[];
  /** Step-by-step how-to (3–5 steps). */
  steps: { name: string; text: string }[];
  /** Practical tips specific to this task (3–5). */
  tips: string[];
  /** Page-specific FAQ (4–6). Answers must be accurate to the editor's real capabilities. */
  faqs: { question: string; answer: string }[];
  /** Slugs of related tools for internal linking (3–4). */
  related: string[];
}
