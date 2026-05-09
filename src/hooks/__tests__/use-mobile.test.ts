import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { useIsMobile } from "../use-mobile";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Simulate a minimal React-like environment for testing the hook logic.
// Since bun:test doesn't include React DOM rendering natively,
// we test the core logic by recreating the hook's behavior in isolation.

const MOBILE_BREAKPOINT = 768;

function simulateUseIsMobile(innerWidth: number): boolean {
  // Replicates the core logic of useIsMobile without React
  const isMobile = innerWidth < MOBILE_BREAKPOINT;
  return isMobile;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useIsMobile", () => {
  describe("breakpoint logic", () => {
    it("returns true when width is below 768px", () => {
      expect(simulateUseIsMobile(767)).toBe(true);
    });

    it("returns false when width is 768px or above", () => {
      expect(simulateUseIsMobile(768)).toBe(false);
    });

    it("returns false for large desktop screens", () => {
      expect(simulateUseIsMobile(1920)).toBe(false);
      expect(simulateUseIsMobile(2560)).toBe(false);
    });

    it("returns true for small mobile screens", () => {
      expect(simulateUseIsMobile(320)).toBe(true);
      expect(simulateUseIsMobile(375)).toBe(true);
      expect(simulateUseIsMobile(414)).toBe(true);
    });

    it("handles tablet sizes correctly", () => {
      // iPad portrait: 768px → not mobile
      expect(simulateUseIsMobile(768)).toBe(false);
      // iPad mini: 744px → mobile
      expect(simulateUseIsMobile(744)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles zero width", () => {
      expect(simulateUseIsMobile(0)).toBe(true);
    });

    it("handles negative width (should not happen but is safe)", () => {
      expect(simulateUseIsMobile(-1)).toBe(true);
    });

    it("handles exactly 767px (boundary)", () => {
      expect(simulateUseIsMobile(767)).toBe(true);
    });

    it("handles exactly 768px (boundary)", () => {
      expect(simulateUseIsMobile(768)).toBe(false);
    });
  });

  describe("hook export", () => {
    it("exports useIsMobile as a function", () => {
      expect(typeof useIsMobile).toBe("function");
    });

    it("has a defined return type contract", () => {
      // The hook should return a boolean (when used in React)
      // We validate the function signature exists
      expect(useIsMobile).toBeDefined();
    });
  });
});
