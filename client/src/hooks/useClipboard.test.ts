import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useClipboard } from "./useClipboard";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from "sonner";

describe("useClipboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a copy function", () => {
    const { result } = renderHook(() => useClipboard());

    expect(typeof result.current.copy).toBe("function");
  });

  it("writes text to clipboard and shows success toast", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy("https://example.com");
    });

    expect(writeText).toHaveBeenCalledWith("https://example.com");
    expect(toast.success).toHaveBeenCalledWith("Copied to clipboard!");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows error toast when clipboard write fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Permission denied"));
    Object.assign(navigator, { clipboard: { writeText } });

    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy("https://example.com");
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to copy to clipboard");
    expect(toast.success).not.toHaveBeenCalled();
  });
});
