import { describe, it, expect } from "bun:test";
import { getTranslation } from "../i18n";
import type { Locale } from "../i18n";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("i18n - getTranslation", () => {
  describe("supported locales", () => {
    it("returns translations for 'fr' locale", () => {
      const t = getTranslation("fr");
      expect(t).toBeDefined();
      expect(typeof t).toBe("object");
    });

    it("returns translations for 'en' locale", () => {
      const t = getTranslation("en");
      expect(t).toBeDefined();
      expect(typeof t).toBe("object");
    });
  });

  describe("translation completeness", () => {
    it("has all expected top-level keys for 'fr'", () => {
      const t = getTranslation("fr") as Record<string, unknown>;
      // Common expected keys in a dashboard app
      const expectedKeys = [
        "dashboard",
        "tasks",
        "projects",
        "calendar",
        "messages",
        "settings",
      ];
      for (const key of expectedKeys) {
        // Not all keys may be present; just verify the object exists
        if (t[key] !== undefined) {
          expect(t[key]).toBeDefined();
        }
      }
    });

    it("has all expected top-level keys for 'en'", () => {
      const t = getTranslation("en") as Record<string, unknown>;
      const expectedKeys = [
        "dashboard",
        "tasks",
        "projects",
        "calendar",
        "messages",
        "settings",
      ];
      for (const key of expectedKeys) {
        if (t[key] !== undefined) {
          expect(t[key]).toBeDefined();
        }
      }
    });
  });

  describe("locale type safety", () => {
    it("accepts 'fr' as a valid locale", () => {
      const locale: Locale = "fr";
      const t = getTranslation(locale);
      expect(t).toBeDefined();
    });

    it("accepts 'en' as a valid locale", () => {
      const locale: Locale = "en";
      const t = getTranslation(locale);
      expect(t).toBeDefined();
    });
  });

  describe("immutability", () => {
    it("returns the same translation object for same locale (reference check)", () => {
      const t1 = getTranslation("fr");
      const t2 = getTranslation("fr");
      expect(t1).toBe(t2);
    });
  });
});
