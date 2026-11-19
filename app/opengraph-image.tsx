import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "BuzzClips - Free Online Video Editor & Video Streaming Platform";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.28) 0%, transparent 45%), radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.28) 0%, transparent 45%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "white",
          padding: "60px",
          position: "relative",
        }}
      >
        {/* Subtle decorative border ring */}
        <div
          style={{
            position: "absolute",
            inset: "24px",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "24px",
          }}
        />

        {/* Brand Play Icon Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "80px",
            height: "80px",
            borderRadius: "22px",
            background: "linear-gradient(135deg, #3b82f6, #a855f7, #ec4899)",
            marginBottom: "24px",
            boxShadow: "0 20px 40px -10px rgba(168, 85, 247, 0.5)",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="6 3 20 12 6 21 6 3" fill="white" />
          </svg>
        </div>

        {/* Brand Name */}
        <div
          style={{
            fontSize: "72px",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            background: "linear-gradient(90deg, #60a5fa, #c084fc, #f472b6)",
            backgroundClip: "text",
            color: "transparent",
            marginBottom: "16px",
          }}
        >
          buzzclips
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "28px",
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.9)",
            letterSpacing: "-0.01em",
            textAlign: "center",
            maxWidth: "760px",
            marginBottom: "12px",
          }}
        >
          Free Online Video Editor & Video Streaming Platform
        </div>

        {/* Sub-tagline */}
        <div
          style={{
            fontSize: "18px",
            fontWeight: 400,
            color: "rgba(255, 255, 255, 0.6)",
            letterSpacing: "0.02em",
          }}
        >
          Trim • Merge • Add Text & Music • No Watermark • Runs in Your Browser
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
