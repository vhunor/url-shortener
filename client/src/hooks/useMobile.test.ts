import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsMobile } from "./useMobile";

const mockMatchMedia = (matches: boolean) => {
  const listeners: Array<() => void> = [];

  const mql = {
    matches,
    addEventListener: vi.fn((_: string, cb: () => void) => {
      listeners.push(cb);
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockReturnValue(mql),
  });

  return { mql, listeners };
};

describe("useIsMobile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when viewport is desktop width", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, value: 1024 });
    mockMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("returns true when viewport is mobile width", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, value: 375 });
    mockMatchMedia(true);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("updates when media query fires a change event", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, value: 1024 });
    const { listeners } = mockMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(window, "innerWidth", { writable: true, value: 375 });
      listeners.forEach((cb) => cb());
    });

    expect(result.current).toBe(true);
  });

  it("removes the event listener on unmount", () => {
    const { mql } = mockMatchMedia(false);

    const { unmount } = renderHook(() => useIsMobile());
    unmount();

    expect(mql.removeEventListener).toHaveBeenCalled();
  });
});
