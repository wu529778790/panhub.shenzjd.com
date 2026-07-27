import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("SEO crawl budget", () => {
  it("does not expose long-tail search actions as crawlable query links", () => {
    const component = readFileSync(
      new URL("../../components/SeoContentPage.vue", import.meta.url),
      "utf8"
    );
    expect(component).not.toContain(`:to="{ path: '/', query:`);
    expect(component).toContain("@click=\"runSearch(keyword)\"");
    expect(component).toContain("@click=\"runSearch(example)\"");
  });
});
