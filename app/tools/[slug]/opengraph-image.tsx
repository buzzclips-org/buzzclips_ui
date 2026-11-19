import { ImageResponse } from "next/og";
import { EDITOR_TOOLS, getEditorTool } from "@/constants/editorTools";

export const alt = "Free online video tool by BuzzClips";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return EDITOR_TOOLS.map((t) => ({ slug: t.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getEditorTool(slug);
  const title = tool?.h1 ?? "Free Online Video Editor";
  const tagline = tool?.tagline ?? "Edit videos in your browser. No watermark.";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#09090b",
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(59,130,246,0.30) 0%, transparent 45%), radial-gradient(circle at 85% 85%, rgba(236,72,153,0.25) 0%, transparent 45%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 800 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg,#3b82f6,#a855f7,#ec4899)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                marginLeft: 6,
                borderTop: "14px solid transparent",
                borderBottom: "14px solid transparent",
                borderLeft: "22px solid white",
              }}
            />
          </div>
          buzzclips
        </div>
        <div style={{ marginTop: 48, fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>{title}</div>
        <div style={{ marginTop: 28, fontSize: 32, color: "rgba(255,255,255,0.75)", lineHeight: 1.3 }}>{tagline}</div>
        <div style={{ marginTop: 48, display: "flex", gap: 16, fontSize: 24 }}>
          {["Free", "No watermark", "No signup", "Private, in-browser"].map((b) => (
            <div key={b} style={{ padding: "8px 18px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.25)" }}>
              {b}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
