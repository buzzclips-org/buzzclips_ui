import {
  activeTexts,
  aspectValue,
  clamp,
  clampTexts,
  cleanFileName,
  clipDuration,
  clipStarts,
  createClipFromAsset,
  createId,
  createTextOverlay,
  duplicateClip,
  estimateExportBytes,
  fadeAmount,
  filterString,
  fitRect,
  formatBytes,
  formatTime,
  locate,
  moveItem,
  outputSize,
  removeAssetReferences,
  rotateBy,
  setSpeed,
  splitAt,
  totalDuration,
  trimClip,
  FILTER_PRESETS,
} from "@/lib/editor/timeline";
import { createEmptyProject, DEFAULT_FILTERS, type Clip, type MediaAsset } from "@/lib/editor/types";

const videoAsset: MediaAsset = {
  id: "a1",
  kind: "video",
  name: "clip.mp4",
  size: 1000,
  mimeType: "video/mp4",
  duration: 10,
  width: 1920,
  height: 1080,
  hasAudio: true,
};

const imageAsset: MediaAsset = { ...videoAsset, id: "img", kind: "image", duration: 0, hasAudio: false };

function clip(partial: Partial<Clip> = {}): Clip {
  return { ...createClipFromAsset(videoAsset), ...partial };
}

describe("editor timeline math", () => {
  it("clamps values", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });

  it("creates unique ids with prefixes", () => {
    const a = createId("x");
    const b = createId("x");
    expect(a).not.toBe(b);
    expect(a.startsWith("x_")).toBe(true);
  });

  it("creates ids without crypto.randomUUID", () => {
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
    expect(createId().startsWith("id_")).toBe(true);
    Object.defineProperty(globalThis, "crypto", { value: original, configurable: true });
  });

  it("computes clip durations with speed", () => {
    expect(clipDuration({ in: 2, out: 6, speed: 1 })).toBe(4);
    expect(clipDuration({ in: 2, out: 6, speed: 2 })).toBe(2);
    expect(clipDuration({ in: 6, out: 2, speed: 1 })).toBe(0);
    expect(clipDuration({ in: 0, out: 4, speed: 0 })).toBe(4);
  });

  it("computes totals and starts", () => {
    const clips = [clip({ out: 4 }), clip({ in: 0, out: 6, speed: 2 }), clip({ out: 1 })];
    expect(totalDuration(clips)).toBe(8);
    expect(clipStarts(clips)).toEqual([0, 4, 7]);
  });

  it("creates clips from assets (images get a default duration)", () => {
    expect(createClipFromAsset(videoAsset).out).toBe(10);
    expect(createClipFromAsset(imageAsset).out).toBe(3);
    expect(createClipFromAsset(videoAsset).filters).toEqual(DEFAULT_FILTERS);
  });

  it("locates the clip under the playhead", () => {
    const clips = [clip({ id: "c1", out: 4 }), clip({ id: "c2", in: 2, out: 6, speed: 2 })];
    expect(locate([], 1)).toBeNull();
    expect(locate(clips, -1)).toBeNull();
    expect(locate(clips, 1)?.clip.id).toBe("c1");
    const hit = locate(clips, 5)!;
    expect(hit.clip.id).toBe("c2");
    expect(hit.start).toBe(4);
    expect(hit.offset).toBe(1);
    expect(hit.sourceTime).toBe(4);
    // exactly the end resolves to the last clip
    expect(locate(clips, 6)?.clip.id).toBe("c2");
    expect(locate(clips, 7)).toBeNull();
  });

  it("splits a clip at the playhead", () => {
    const clips = [clip({ id: "c1", out: 10 })];
    const { clips: out, newClipId } = splitAt(clips, 4);
    expect(out).toHaveLength(2);
    expect(out[0].out).toBe(4);
    expect(out[1].in).toBe(4);
    expect(out[1].id).toBe(newClipId);
  });

  it("refuses to split at clip edges or outside", () => {
    const clips = [clip({ out: 10 })];
    expect(splitAt(clips, 0).newClipId).toBeNull();
    expect(splitAt(clips, 9.99).newClipId).toBeNull();
    expect(splitAt(clips, 20).newClipId).toBeNull();
  });

  it("trims and clamps clips", () => {
    const c = clip({ in: 0, out: 10 });
    expect(trimClip(c, { in: 3 }, 10)).toMatchObject({ in: 3, out: 10 });
    expect(trimClip(c, { out: 20 }, 10).out).toBe(10);
    expect(trimClip(c, { in: -5 }, 10).in).toBe(0);
    const tight = trimClip(c, { in: 9.99 }, 10);
    expect(tight.out - tight.in).toBeGreaterThanOrEqual(0.1 - 1e-9);
    // image clips have no source limit
    expect(trimClip(c, { out: 25 }, Infinity).out).toBe(25);
  });

  it("keeps a minimum duration when only trimming the end", () => {
    const c = clip({ in: 5, out: 10 });
    const t = trimClip(c, { out: 4 }, 10);
    expect(t.out).toBeGreaterThan(t.in);
  });

  it("clamps speed", () => {
    expect(setSpeed(clip(), 10).speed).toBe(4);
    expect(setSpeed(clip(), 0.1).speed).toBe(0.25);
  });

  it("moves items", () => {
    expect(moveItem([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
    expect(moveItem([1, 2, 3], 2, 0)).toEqual([3, 1, 2]);
    const same = [1, 2];
    expect(moveItem(same, 1, 1)).toBe(same);
    expect(moveItem(same, 5, 0)).toBe(same);
  });

  it("duplicates clips", () => {
    const clips = [clip({ id: "c1" }), clip({ id: "c2" })];
    const { clips: out, newClipId } = duplicateClip(clips, "c1");
    expect(out).toHaveLength(3);
    expect(out[1].id).toBe(newClipId);
    expect(duplicateClip(clips, "missing").newClipId).toBeNull();
  });

  it("rotates in 90° steps", () => {
    expect(rotateBy(0, 90)).toBe(90);
    expect(rotateBy(0, -90)).toBe(270);
    expect(rotateBy(270, 90)).toBe(0);
  });

  it("computes output sizes for every aspect", () => {
    expect(outputSize("16:9", 1080)).toEqual({ width: 1920, height: 1080 });
    expect(outputSize("9:16", 1080)).toEqual({ width: 1080, height: 1920 });
    expect(outputSize("1:1", 720)).toEqual({ width: 720, height: 720 });
    expect(outputSize("4:5", 1080)).toEqual({ width: 1080, height: 1350 });
    expect(outputSize("16:9", 480)).toEqual({ width: 854, height: 480 });
    expect(aspectValue("9:16")).toBeCloseTo(0.5625);
  });

  it("fits and fills media into the frame", () => {
    expect(fitRect(1920, 1080, 0, 1080, 1920, "contain")).toEqual({ x: 0, y: 656.25, width: 1080, height: 607.5 });
    const cover = fitRect(1920, 1080, 0, 1080, 1920, "cover");
    expect(cover.height).toBe(1920);
    expect(cover.x).toBeLessThan(0);
    // rotated 90° portrait-in-landscape becomes full height
    expect(fitRect(1920, 1080, 90, 1080, 1920, "contain")).toEqual({ x: 0, y: 0, width: 1080, height: 1920 });
    expect(fitRect(0, 0, 0, 100, 50, "contain")).toEqual({ x: 0, y: 0, width: 100, height: 50 });
  });

  it("builds filter strings", () => {
    expect(filterString(DEFAULT_FILTERS)).toBe("none");
    const f = filterString({ brightness: 110, contrast: 90, saturation: 120, grayscale: 50, sepia: 10, blur: 2 }, 0.5);
    expect(f).toBe("brightness(110%) contrast(90%) saturate(120%) grayscale(50%) sepia(10%) blur(1.00px)");
    expect(FILTER_PRESETS[0].name).toBe("Original");
  });

  it("computes fade amounts", () => {
    expect(fadeAmount(0, 10, 1, 1)).toBe(1);
    expect(fadeAmount(0.5, 10, 1, 1)).toBeCloseTo(0.5);
    expect(fadeAmount(5, 10, 1, 1)).toBe(0);
    expect(fadeAmount(9.5, 10, 1, 1)).toBeCloseTo(0.5);
    expect(fadeAmount(5, 10, 0, 0)).toBe(0);
  });

  it("filters active texts and creates overlays", () => {
    const t = createTextOverlay(2, 10);
    expect(t.start).toBe(2);
    expect(t.end).toBe(5);
    expect(activeTexts([t], 3)).toHaveLength(1);
    expect(activeTexts([t], 5)).toHaveLength(0);
    const short = createTextOverlay(0, 1.5);
    expect(short.end).toBe(1.5);
    const empty = createTextOverlay(0, 0);
    expect(empty.end).toBe(3);
  });

  it("clamps texts to the timeline", () => {
    const t = { ...createTextOverlay(0, 10), start: 8, end: 12 };
    expect(clampTexts([t], 10)[0]).toMatchObject({ start: 8, end: 10 });
    const past = { ...t, start: 11, end: 13 };
    const clamped = clampTexts([past], 10)[0];
    expect(clamped.end).toBe(10);
    expect(clamped.start).toBeLessThan(10);
    expect(clampTexts([t], 0)).toEqual([t]);
    const inside = { ...t, start: 1, end: 2 };
    expect(clampTexts([inside], 10)[0]).toBe(inside);
  });

  it("formats time and bytes", () => {
    expect(formatTime(0)).toBe("0:00.0");
    expect(formatTime(65.47)).toBe("1:05.4");
    expect(formatTime(3725, false)).toBe("1:02:05");
    expect(formatTime(NaN)).toBe("0:00.0");
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(50 * 1024 * 1024)).toBe("50 MB");
  });

  it("estimates export size", () => {
    const bytes = estimateExportBytes({ aspect: "16:9", resolution: 720, fps: 30 }, 10);
    expect(bytes).toBeGreaterThan(1_000_000);
    expect(estimateExportBytes({ aspect: "16:9", resolution: 720, fps: 30 }, 0)).toBe(0);
  });

  it("removes asset references", () => {
    const project = {
      ...createEmptyProject(),
      clips: [clip({ assetId: "a1" }), clip({ assetId: "a2" })],
      music: { assetId: "a1", volume: 1, offset: 0, trimStart: 0, loop: false },
    };
    const out = removeAssetReferences(project, "a1");
    expect(out.clips).toHaveLength(1);
    expect(out.music).toBeNull();
    expect(removeAssetReferences(project, "zzz").music).not.toBeNull();
  });

  it("cleans file names", () => {
    expect(cleanFileName("My Trip!! 2024.mov")).toBe("My-Trip-2024");
    expect(cleanFileName("???")).toBe("buzzclips-video");
  });

  it("creates an empty project", () => {
    const p = createEmptyProject("Test");
    expect(p).toMatchObject({ version: 1, name: "Test", clips: [], texts: [], music: null });
    expect(createEmptyProject().name).toBe("Untitled project");
  });
});
