import { renderHook, act, waitFor } from "@testing-library/react";
import {
  cleanHandle,
  RESERVED_HANDLES,
  useUsernameAvailability,
} from "@/utility/useUsernameAvailability";

describe("cleanHandle", () => {
  it("handles null, undefined, and empty string", () => {
    expect(cleanHandle(null)).toBe("");
    expect(cleanHandle(undefined)).toBe("");
    expect(cleanHandle("")).toBe("");
  });

  it("strips leading @ symbol and trims whitespace", () => {
    expect(cleanHandle(" @alex ")).toBe("alex");
    expect(cleanHandle("@john_doe")).toBe("john_doe");
    expect(cleanHandle("   cool_creator   ")).toBe("cool_creator");
  });
});

describe("RESERVED_HANDLES", () => {
  it("contains core system names", () => {
    expect(RESERVED_HANDLES.has("admin")).toBe(true);
    expect(RESERVED_HANDLES.has("buzzclips")).toBe(true);
    expect(RESERVED_HANDLES.has("bideo")).toBe(true);
    expect(RESERVED_HANDLES.has("root")).toBe(true);
  });
});

describe("useUsernameAvailability hook", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("initializes with idle state for empty username", () => {
    const { result } = renderHook(() => useUsernameAvailability(""));
    expect(result.current.status).toBe("idle");
    expect(result.current.message).toBe("");
    expect(result.current.isAvailable).toBe(false);
    expect(result.current.isChecking).toBe(false);
  });

  it("flags handles shorter than 3 characters as invalid", () => {
    const { result } = renderHook(() => useUsernameAvailability("ab", 10));
    expect(result.current.status).toBe("invalid");
    expect(result.current.message).toBe("Handle must be 3-30 characters");
    expect(result.current.isValid).toBe(false);
  });

  it("flags handles longer than 30 characters as invalid", () => {
    const { result } = renderHook(() =>
      useUsernameAvailability("a".repeat(31), 10)
    );
    expect(result.current.status).toBe("invalid");
    expect(result.current.message).toBe("Handle must be 3-30 characters");
  });

  it("flags handles with disallowed special characters as invalid", () => {
    const { result } = renderHook(() =>
      useUsernameAvailability("invalid-handle!", 10)
    );
    expect(result.current.status).toBe("invalid");
    expect(result.current.message).toBe("Letters, numbers, and underscores only");
  });

  it("flags reserved handles as invalid", () => {
    const { result } = renderHook(() =>
      useUsernameAvailability("admin", 10)
    );
    expect(result.current.status).toBe("invalid");
    expect(result.current.message).toBe("@admin is reserved");
  });

  it("marks username as available when server responds available", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ valid: true, available: true }),
    } as unknown as Response);

    const { result } = renderHook(() =>
      useUsernameAvailability("fresh_handle", 10)
    );

    expect(result.current.status).toBe("checking");

    await waitFor(() => {
      expect(result.current.status).toBe("available");
      expect(result.current.message).toBe("@fresh_handle is available!");
      expect(result.current.isAvailable).toBe(true);
    });
  });

  it("marks username as taken when server responds taken", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ valid: true, available: false }),
    } as unknown as Response);

    const { result } = renderHook(() =>
      useUsernameAvailability("taken_handle", 10)
    );

    await waitFor(() => {
      expect(result.current.status).toBe("taken");
      expect(result.current.message).toBe("@taken_handle is already taken");
      expect(result.current.isAvailable).toBe(false);
    });
  });

  it("handles server returning valid: false", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ valid: false, available: false }),
    } as unknown as Response);

    const { result } = renderHook(() =>
      useUsernameAvailability("some_user", 10)
    );

    await waitFor(() => {
      expect(result.current.status).toBe("invalid");
      expect(result.current.message).toBe("Invalid handle format");
    });
  });

  it("handles non-200 HTTP response gracefully", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    const { result } = renderHook(() =>
      useUsernameAvailability("valid_user", 10)
    );

    await waitFor(() => {
      expect(result.current.status).toBe("idle");
      expect(result.current.message).toBe("Could not verify handle");
    });
  });

  it("handles network error gracefully", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network failed"));

    const { result } = renderHook(() =>
      useUsernameAvailability("valid_user", 10)
    );

    await waitFor(() => {
      expect(result.current.status).toBe("idle");
      expect(result.current.message).toBe("Could not verify username");
    });
  });

  it("supports setUsername updater", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ valid: true, available: true }),
    } as unknown as Response);

    const { result } = renderHook(() => useUsernameAvailability("", 10));

    act(() => {
      result.current.setUsername("new_user");
    });

    await waitFor(() => {
      expect(result.current.status).toBe("available");
    });
  });
});
