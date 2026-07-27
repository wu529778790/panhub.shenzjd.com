import { describe, expect, it } from "vitest";
import {
  getMediaCatalogEntry,
  getMediaCatalogPath,
  getMediaDescription,
  getMediaSearchExamples,
  getMediaSeoTitle,
  getRelatedMedia,
  mediaCatalogEntries,
} from "../../config/mediaCatalog";

describe("media catalog SEO pages", () => {
  it("publishes a focused set of unique high-quality titles", () => {
    expect(mediaCatalogEntries).toHaveLength(103);
    expect(new Set(mediaCatalogEntries.map((entry) => entry.id)).size).toBe(103);
    expect(new Set(mediaCatalogEntries.map((entry) => entry.title)).size).toBe(103);
    expect(mediaCatalogEntries.every((entry) => entry.rating >= 6)).toBe(true);
    expect(
      mediaCatalogEntries.filter((entry) => entry.kind === "movie")
    ).toHaveLength(70);
    expect(
      mediaCatalogEntries.filter((entry) => entry.kind === "tv")
    ).toHaveLength(33);
  });

  it("builds stable paths and complete metadata for every title", () => {
    for (const entry of mediaCatalogEntries) {
      expect(getMediaCatalogEntry(entry.id)).toBe(entry);
      expect(getMediaCatalogPath(entry)).toBe(`/media/${entry.id}`);
      expect(getMediaSeoTitle(entry).length).toBeGreaterThanOrEqual(12);
      expect(getMediaSeoTitle(entry).length).toBeLessThanOrEqual(65);
      expect(getMediaDescription(entry).length).toBeGreaterThanOrEqual(35);
      expect(getMediaDescription(entry).length).toBeLessThanOrEqual(170);
      expect(entry.cover).toMatch(/^https:\/\/img[1-9]\.doubanio\.com\//);
      expect(entry.year).toMatch(/^\d{4}$/);
      expect(entry.genres.length).toBeGreaterThan(0);
    }
  });

  it("provides useful search variants without duplicate query pages", () => {
    for (const entry of mediaCatalogEntries) {
      const examples = getMediaSearchExamples(entry);
      expect(examples).toHaveLength(5);
      expect(new Set(examples).size).toBe(5);
      expect(examples.every((keyword) => keyword.includes(entry.title))).toBe(true);
    }
  });

  it("returns deterministic related titles", () => {
    const entry = getMediaCatalogEntry("37071123")!;
    const related = getRelatedMedia(entry);
    expect(related).toHaveLength(6);
    expect(related.every((item) => item.id !== entry.id)).toBe(true);
    expect(getRelatedMedia(entry).map((item) => item.id)).toEqual(
      related.map((item) => item.id)
    );
  });
});
