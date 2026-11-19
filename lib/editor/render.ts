import { Clip, ProjectSettings, TextOverlay } from "./types";
import { activeTexts, fadeAmount, filterString, fitRect } from "./timeline";

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface FrameSource {
  image: CanvasImageSource | null;
  width: number;
  height: number;
  clip: Clip | null;
}

const FONT_FAMILIES: Record<TextOverlay["font"], string> = {
  sans: "Inter, 'Helvetica Neue', Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'SFMono-Regular', Menlo, Consolas, monospace",
};

export function fontFor(text: Pick<TextOverlay, "bold" | "font">, px: number): string {
  return `${text.bold ? "700" : "500"} ${Math.round(px)}px ${FONT_FAMILIES[text.font]}`;
}

/**
 * Draws one composited output frame. Used by both the live preview and the
 * exporter, so what you see is exactly what gets rendered.
 */
export function drawFrame(
  ctx: Ctx2D,
  width: number,
  height: number,
  settings: Pick<ProjectSettings, "background" | "fadeIn" | "fadeOut">,
  frame: FrameSource,
  texts: TextOverlay[],
  t: number,
  total: number
): void {
  ctx.save();
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.fillStyle = settings.background || "#000000";
  ctx.fillRect(0, 0, width, height);

  const { image, clip } = frame;
  if (image && clip && frame.width > 0 && frame.height > 0) {
    const rect = fitRect(frame.width, frame.height, clip.rotation, width, height, clip.fit);
    const swapped = clip.rotation === 90 || clip.rotation === 270;
    const dw = swapped ? rect.height : rect.width;
    const dh = swapped ? rect.width : rect.height;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    ctx.filter = filterString(clip.filters, height / 1080);
    ctx.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
    if (clip.rotation) ctx.rotate((clip.rotation * Math.PI) / 180);
    if (clip.flipH || clip.flipV) ctx.scale(clip.flipH ? -1 : 1, clip.flipV ? -1 : 1);
    ctx.drawImage(image, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }

  for (const text of activeTexts(texts, t)) {
    drawText(ctx, width, height, text);
  }

  const fade = fadeAmount(t, total, settings.fadeIn, settings.fadeOut);
  if (fade > 0) {
    ctx.globalAlpha = fade;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export interface TextBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Measures the bounding box of a text overlay in output pixels. */
export function measureText(ctx: Ctx2D, width: number, height: number, text: TextOverlay): TextBox {
  const px = Math.max(8, text.size * height);
  ctx.save();
  ctx.font = fontFor(text, px);
  const lines = (text.text || " ").split("\n");
  const lineHeight = px * 1.2;
  const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width), px * 0.5);
  ctx.restore();
  const pad = px * 0.35;
  const boxW = maxW + pad * 2;
  const boxH = lines.length * lineHeight + pad * 2;
  return { x: text.x * width - boxW / 2, y: text.y * height - boxH / 2, width: boxW, height: boxH };
}

export function drawText(ctx: Ctx2D, width: number, height: number, text: TextOverlay): void {
  if (!text.text.trim()) return;
  const px = Math.max(8, text.size * height);
  const box = measureText(ctx, width, height, text);
  const lines = text.text.split("\n");
  const lineHeight = px * 1.2;

  ctx.save();
  ctx.filter = "none";
  if (text.background) {
    ctx.fillStyle = text.background;
    const r = Math.min(px * 0.25, box.height / 2);
    roundRect(ctx, box.x, box.y, box.width, box.height, r);
    ctx.fill();
  }
  ctx.font = fontFor(text, px);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  const cx = text.x * width;
  const firstY = text.y * height - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    const y = firstY + i * lineHeight;
    if (text.outline) {
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.lineWidth = Math.max(2, px * 0.12);
      ctx.strokeText(line, cx, y);
    }
    ctx.fillStyle = text.color;
    ctx.fillText(line, cx, y);
  });
  ctx.restore();
}

function roundRect(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
