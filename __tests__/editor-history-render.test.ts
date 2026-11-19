import { historyReducer, initHistory, HISTORY_LIMIT } from "@/lib/editor/history";
import { drawFrame, drawText, fontFor, measureText } from "@/lib/editor/render";
import { createEmptyProject, DEFAULT_FILTERS, DEFAULT_SETTINGS, type Clip, type TextOverlay } from "@/lib/editor/types";
import { safeRedirectPath } from "@/utility/redirect";

describe("editor history", () => {
  const p0 = createEmptyProject("p0");
  const p1 = { ...p0, name: "p1" };
  const p2 = { ...p0, name: "p2" };

  it("records, undoes and redoes", () => {
    let s = initHistory(p0);
    s = historyReducer(s, { type: "set", project: p1 });
    s = historyReducer(s, { type: "set", project: p2 });
    expect(s.past).toHaveLength(2);
    s = historyReducer(s, { type: "undo" });
    expect(s.present.name).toBe("p1");
    s = historyReducer(s, { type: "redo" });
    expect(s.present.name).toBe("p2");
    expect(historyReducer(s, { type: "redo" })).toBe(s);
  });

  it("ignores no-op sets and empty undo", () => {
    const s = initHistory(p0);
    expect(historyReducer(s, { type: "set", project: p0 })).toBe(s);
    expect(historyReducer(s, { type: "undo" })).toBe(s);
  });

  it("coalesces grouped changes into one undo step", () => {
    let s = initHistory(p0);
    s = historyReducer(s, { type: "set", project: p1, group: "slider" });
    s = historyReducer(s, { type: "set", project: p2, group: "slider" });
    expect(s.past).toHaveLength(1);
    s = historyReducer(s, { type: "endGroup" });
    expect(s.lastGroup).toBeNull();
    expect(historyReducer(s, { type: "endGroup" })).toBe(s);
    s = historyReducer(s, { type: "set", project: p1, group: "slider" });
    expect(s.past).toHaveLength(2);
  });

  it("replaces without history and caps history length", () => {
    let s = initHistory(p0);
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) {
      s = historyReducer(s, { type: "set", project: { ...p0, name: String(i) } });
    }
    expect(s.past.length).toBe(HISTORY_LIMIT);
    s = historyReducer(s, { type: "replace", project: p2 });
    expect(s).toEqual(initHistory(p2));
    // unknown actions are ignored
    expect(historyReducer(s, { type: "nope" } as never)).toBe(s);
  });
});

function mockCtx() {
  const calls: string[] = [];
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop === "measureText") return (t: string) => ({ width: t.length * 10 });
      return (...args: unknown[]) => {
        calls.push(`${prop}(${args.length})`);
      };
    },
    set(target, prop: string, value) {
      target[prop] = value;
      calls.push(`${prop}=`);
      return true;
    },
  };
  const ctx = new Proxy<Record<string, unknown>>({}, handler);
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const clip: Clip = {
  id: "c",
  assetId: "a",
  in: 0,
  out: 5,
  speed: 1,
  volume: 1,
  muted: false,
  rotation: 90,
  flipH: true,
  flipV: false,
  fit: "contain",
  filters: { ...DEFAULT_FILTERS, brightness: 120 },
};

const text: TextOverlay = {
  id: "t",
  text: "Hello\nWorld",
  start: 0,
  end: 5,
  x: 0.5,
  y: 0.5,
  size: 0.1,
  color: "#fff",
  background: "#000",
  bold: true,
  outline: true,
  font: "serif",
};

describe("editor render", () => {
  it("draws background, media, texts and fades", () => {
    const { ctx, calls } = mockCtx();
    drawFrame(ctx, 1280, 720, { ...DEFAULT_SETTINGS, fadeIn: 1 }, { image: {} as CanvasImageSource, width: 1920, height: 1080, clip }, [text], 0.5, 5);
    expect(calls).toContain("drawImage(5)");
    expect(calls).toContain("rotate(1)");
    expect(calls).toContain("scale(2)");
    expect(calls.filter((c) => c === "fillText(3)")).toHaveLength(2);
    expect(calls.filter((c) => c === "strokeText(3)")).toHaveLength(2);
    expect(calls.filter((c) => c === "fillRect(4)").length).toBeGreaterThanOrEqual(2);
  });

  it("draws only background when there is no media", () => {
    const { ctx, calls } = mockCtx();
    drawFrame(ctx, 100, 100, { background: "", fadeIn: 0, fadeOut: 0 }, { image: null, width: 0, height: 0, clip: null }, [], 0, 0);
    expect(calls).not.toContain("drawImage(5)");
    expect(calls).toContain("fillRect(4)");
  });

  it("draws media without rotation or flips", () => {
    const { ctx, calls } = mockCtx();
    const plain = { ...clip, rotation: 0 as const, flipH: false };
    drawFrame(ctx, 100, 100, DEFAULT_SETTINGS, { image: {} as CanvasImageSource, width: 50, height: 50, clip: plain }, [], 0, 1);
    expect(calls).not.toContain("rotate(1)");
    expect(calls).not.toContain("scale(2)");
  });

  it("measures text and skips empty text", () => {
    const { ctx, calls } = mockCtx();
    const box = measureText(ctx, 1000, 1000, text);
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(200);
    drawText(ctx, 1000, 1000, { ...text, text: "   " });
    expect(calls).not.toContain("fillText(3)");
    const plain = { ...text, background: "", outline: false, bold: false, font: "mono" as const };
    drawText(ctx, 1000, 1000, plain);
    expect(calls).toContain("fillText(3)");
    expect(calls).not.toContain("strokeText(3)");
    expect(fontFor(plain, 20)).toContain("500 20px");
    expect(measureText(ctx, 100, 100, { ...text, text: "" }).width).toBeGreaterThan(0);
  });
});

describe("safeRedirectPath", () => {
  it("allows same-origin relative paths", () => {
    expect(safeRedirectPath("/video/upload?source=editor")).toBe("/video/upload?source=editor");
  });

  it("rejects unsafe or missing values", () => {
    expect(safeRedirectPath(null)).toBe("/");
    expect(safeRedirectPath("https://evil.com")).toBe("/");
    expect(safeRedirectPath("//evil.com")).toBe("/");
    expect(safeRedirectPath("/\\evil.com")).toBe("/");
    expect(safeRedirectPath("/ok\nbad")).toBe("/");
    expect(safeRedirectPath("/auth/login")).toBe("/");
    expect(safeRedirectPath(undefined, "/explore")).toBe("/explore");
  });
});
