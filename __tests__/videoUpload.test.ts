import axios from "axios";
import {
  isCancelError,
  isNetworkError,
  parseTags,
  subscribeTranscodeProgress,
  uploadVideo,
  uploadVideoDirect,
  uploadVideoLegacy,
  VIDEO_CATEGORIES,
} from "@/utility/videoUpload";
import * as requests from "@/utility/requests";

jest.mock("axios", () => {
  const fn = { put: jest.fn(), post: jest.fn(), isCancel: jest.fn((e) => e?.__CANCEL__ === true) };
  return { __esModule: true, default: fn, ...fn };
});
jest.mock("@/utility/requests", () => ({
  requestPresignedUpload: jest.fn(),
  completePresignedUpload: jest.fn(),
  abortPresignedUpload: jest.fn(() => Promise.resolve()),
}));

const mockedAxios = axios as unknown as { put: jest.Mock; post: jest.Mock; isCancel: jest.Mock };
const req = requests as jest.Mocked<typeof requests>;
const file = new File(["data"], "edit.mp4", { type: "video/mp4" });
const meta = { videoTitle: "My edit", description: "d", category: "TECH", visibility: "PUBLIC" as const, tags: "a, b,,c " };

beforeEach(() => {
  jest.clearAllMocks();
  req.requestPresignedUpload.mockResolvedValue({ uploadUrl: "https://s3/put", s3Key: "k", processId: "p1" });
  req.completePresignedUpload.mockResolvedValue({ videoId: 42, message: "ok" });
});

describe("helpers", () => {
  it("parses tags", () => {
    expect(parseTags(meta.tags)).toEqual(["a", "b", "c"]);
    expect(parseTags(undefined)).toEqual([]);
  });
  it("detects network and cancel errors", () => {
    expect(isNetworkError({ message: "Network Error" })).toBe(true);
    expect(isNetworkError({ code: "ERR_NETWORK" })).toBe(true);
    expect(isNetworkError(null)).toBe(false);
    expect(isCancelError({ __CANCEL__: true })).toBe(true);
    expect(isCancelError(new DOMException("x", "AbortError"))).toBe(true);
    expect(isCancelError(new Error("x"))).toBe(false);
  });
  it("lists categories", () => {
    expect(VIDEO_CATEGORIES).toContain("OTHER");
  });
});

describe("uploadVideoDirect", () => {
  it("PUTs to S3 then completes with metadata", async () => {
    mockedAxios.put.mockImplementation((_u, _f, cfg) => {
      cfg.onUploadProgress({ loaded: 2, total: 4 });
      cfg.onUploadProgress({ loaded: 4 });
      return Promise.resolve();
    });
    const progress: number[] = [];
    const res = await uploadVideoDirect(file, meta, "tok", (p) => progress.push(p));
    expect(res).toEqual({ videoId: 42, processId: "p1", via: "direct" });
    expect(progress).toEqual([50, 100]);
    expect(req.completePresignedUpload).toHaveBeenCalledWith(
      expect.objectContaining({ s3Key: "k", processId: "p1", videoTitle: "My edit", tags: ["a", "b", "c"] }),
      "tok"
    );
  });

  it("uses the process id returned by complete when the presign has none", async () => {
    req.requestPresignedUpload.mockResolvedValue({ uploadUrl: "u", s3Key: "k" });
    req.completePresignedUpload.mockResolvedValue({ videoId: 1, message: "", processId: "p2" });
    mockedAxios.put.mockResolvedValue(undefined);
    const typeless = new File(["x"], "a.mp4");
    expect((await uploadVideoDirect(typeless, meta, "t", jest.fn())).processId).toBe("p2");
    expect(req.requestPresignedUpload).toHaveBeenCalledWith("a.mp4", "video/mp4", "t");
  });

  it("aborts the server process when the upload fails", async () => {
    mockedAxios.put.mockRejectedValue(new Error("boom"));
    await expect(uploadVideoDirect(file, meta, "tok", jest.fn())).rejects.toThrow("boom");
    expect(req.abortPresignedUpload).toHaveBeenCalledWith("p1", "tok");
  });

  it("does not abort when there is no process id", async () => {
    req.requestPresignedUpload.mockResolvedValue({ uploadUrl: "u", s3Key: "k" });
    mockedAxios.put.mockRejectedValue(new Error("boom"));
    await expect(uploadVideoDirect(file, meta, "tok", jest.fn())).rejects.toThrow();
    expect(req.abortPresignedUpload).not.toHaveBeenCalled();
  });
});

describe("uploadVideoLegacy", () => {
  it("posts multipart form data", async () => {
    mockedAxios.post.mockImplementation((_u, fd: FormData, cfg) => {
      expect(fd.get("videoTitle")).toBe("My edit");
      expect(fd.get("tags")).toBe(meta.tags);
      cfg.onUploadProgress({ loaded: 1, total: 2 });
      cfg.onUploadProgress({ loaded: 1 });
      return Promise.resolve({ data: { id: 7 } });
    });
    const progress: number[] = [];
    expect(await uploadVideoLegacy(file, meta, "tok", "u1", (p) => progress.push(p))).toEqual({ videoId: 7, via: "legacy" });
    expect(progress).toEqual([50]);
  });

  it("handles minimal metadata and videoId responses", async () => {
    mockedAxios.post.mockImplementation((_u, fd: FormData) => {
      expect(fd.get("description")).toBeNull();
      return Promise.resolve({ data: { videoId: 9 } });
    });
    expect((await uploadVideoLegacy(file, { videoTitle: "t" }, "tok", "u", jest.fn())).videoId).toBe(9);
  });
});

describe("uploadVideo", () => {
  it("falls back to legacy upload when direct fails", async () => {
    mockedAxios.put.mockRejectedValue({ message: "Network Error" });
    mockedAxios.post.mockResolvedValue({ data: { id: 5 } });
    const onFallback = jest.fn();
    const res = await uploadVideo({ file, meta, token: "t", userId: "u", onProgress: jest.fn(), onFallback });
    expect(res.via).toBe("legacy");
    expect(onFallback).toHaveBeenCalled();
  });

  it("does not fall back when cancelled", async () => {
    mockedAxios.put.mockRejectedValue({ __CANCEL__: true });
    await expect(uploadVideo({ file, meta, token: "t", userId: "u", onProgress: jest.fn() })).rejects.toEqual({ __CANCEL__: true });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("does not fall back when the signal was aborted", async () => {
    const c = new AbortController();
    c.abort();
    mockedAxios.put.mockRejectedValue(new Error("x"));
    await expect(uploadVideo({ file, meta, token: "t", userId: "u", onProgress: jest.fn(), signal: c.signal })).rejects.toThrow("x");
  });
});

class FakeEventSource {
  static last: FakeEventSource | null = null;
  listeners: Record<string, (e: { data: string }) => void> = {};
  onerror: (() => void) | null = null;
  closed = false;
  constructor(public url: string) {
    FakeEventSource.last = this;
  }
  addEventListener(name: string, fn: (e: { data: string }) => void) {
    this.listeners[name] = fn;
  }
  close() {
    this.closed = true;
  }
}

describe("subscribeTranscodeProgress", () => {
  const originalES = (global as unknown as { EventSource?: unknown }).EventSource;
  beforeEach(() => {
    (global as unknown as { EventSource: unknown }).EventSource = FakeEventSource;
    jest.useFakeTimers();
  });
  afterEach(() => {
    (global as unknown as { EventSource: unknown }).EventSource = originalES;
    jest.useRealTimers();
  });

  it("returns a no-op without ids", () => {
    const stop = subscribeTranscodeProgress({ onUpdate: jest.fn() });
    expect(() => stop()).not.toThrow();
  });

  it("streams progress via SSE by process id and stops on completion", () => {
    const onUpdate = jest.fn();
    subscribeTranscodeProgress({ processId: "p 1", onUpdate });
    const es = FakeEventSource.last!;
    expect(es.url).toContain("/vid/upload/process/p%201/progress");
    es.listeners.progress({ data: JSON.stringify({ percent: "40", stage: "ENCODING" }) });
    es.listeners.progress({ data: "not json" });
    es.listeners.progress({ data: JSON.stringify({ percent: 100, videoId: 3 }) });
    expect(onUpdate).toHaveBeenNthCalledWith(1, expect.objectContaining({ percent: 40, stage: "ENCODING", status: "PROCESSING" }));
    expect(onUpdate).toHaveBeenNthCalledWith(2, expect.objectContaining({ status: "COMPLETED", stage: "PROCESSING", videoId: 3 }));
    expect(es.closed).toBe(true);
    es.listeners.progress({ data: JSON.stringify({ percent: 50 }) });
    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  it("falls back to polling by video id when SSE errors", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ videoStatus: "PROCESSING" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "COMPLETED" }) });
    global.fetch = fetchMock as unknown as typeof fetch;
    const onUpdate = jest.fn();
    subscribeTranscodeProgress({ videoId: 8, onUpdate, pollMs: 1000 });
    const es = FakeEventSource.last!;
    expect(es.url).toContain("/vid/8/transcode-progress");
    es.onerror!();
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(1000);
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: "PROCESSING", percent: 50 }));
    expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ status: "COMPLETED", percent: 100 }));
    await jest.advanceTimersByTimeAsync(3000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("polls when EventSource cannot be created, and survives fetch errors", async () => {
    (global as unknown as { EventSource: unknown }).EventSource = function () {
      throw new Error("no SSE");
    };
    jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
    const onUpdate = jest.fn();
    const stop = subscribeTranscodeProgress({ videoId: 2, onUpdate, pollMs: 500 });
    await jest.advanceTimersByTimeAsync(600);
    expect(global.fetch).toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();
    stop();
  });

  it("does not poll without a video id when SSE fails", () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    subscribeTranscodeProgress({ processId: "p", onUpdate: jest.fn() });
    FakeEventSource.last!.onerror!();
    jest.advanceTimersByTime(5000);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
