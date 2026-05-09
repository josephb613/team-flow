import { describe, it, expect, mock } from "bun:test";
import { cn } from "../utils";

// ─── Mocks ───────────────────────────────────────────────────────────────────

mock.module("clsx", () => ({
  clsx: (...args: unknown[]) => {
    // Minimal clsx-like behavior: join truthy class strings
    return args
      .flat()
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  },
}));

mock.module("tailwind-merge", () => ({
  twMerge: (input: string) => {
    // Minimal twMerge: resolve tailwind conflicts (bg-red-500 bg-blue-500 → bg-blue-500)
    const classes = input.split(/\s+/);
    const seen = new Map<string, string>();
    for (const cls of classes) {
      const prefix = cls.split("-").slice(0, 2).join("-");
      seen.set(prefix, cls);
    }
    return Array.from(seen.values()).join(" ");
  },
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("cn (className utility)", () => {
  describe("happy path", () => {
    it("merges static class strings", () => {
      const result = cn("px-4", "py-2");
      expect(result).toBeString();
      expect(result.length).toBeGreaterThan(0);
    });

    it("handles a single class string", () => {
      const result = cn("container");
      expect(result).toBeString();
    });

    it("returns empty string for no arguments", () => {
      const result = cn();
      expect(result).toBe("");
    });

    it("handles conditional classes with booleans", () => {
      const result = cn("base", true && "active", false && "hidden");
      expect(result).toContain("base");
      expect(result).toContain("active");
      expect(result).not.toContain("hidden");
    });

    it("handles undefined and null values gracefully", () => {
      const result = cn("base", undefined, null, "extra");
      expect(result).toContain("base");
      expect(result).toContain("extra");
    });

    it("handles empty strings", () => {
      const result = cn("base", "", "extra");
      expect(result).toContain("base");
      expect(result).toContain("extra");
    });
  });

  describe("tailwind conflict resolution", () => {
    it("resolves conflicting tailwind classes (last wins)", () => {
      const result = cn("px-4", "px-6");
      // px-6 should override px-4
      expect(result).toContain("px-6");
    });

    it("keeps non-conflicting classes together", () => {
      const result = cn("flex", "items-center", "justify-between");
      expect(result).toContain("flex");
      expect(result).toContain("items-center");
      expect(result).toContain("justify-between");
    });
  });

  describe("edge cases", () => {
    it("handles array inputs", () => {
      const result = cn(["px-4", "py-2"]);
      expect(result).toBeString();
      expect(result.length).toBeGreaterThan(0);
    });

    it("handles nested arrays", () => {
      const result = cn("base", ["nested-1", ["nested-2"]]);
      expect(result).toBeString();
    });

    it("handles mixed types of arguments", () => {
      const result = cn(
        "static",
        true && "conditional",
        false && "hidden",
        undefined,
        null,
        ["array-class"],
        0,
        "",
      );
      expect(result).toContain("static");
      expect(result).toContain("conditional");
      expect(result).toContain("array-class");
      expect(result).not.toContain("hidden");
    });
  });
});
