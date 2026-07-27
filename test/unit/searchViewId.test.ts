import { describe, expect, it } from "vitest";
import { createSearchViewId } from "../../utils/searchViewId";

describe("createSearchViewId", () => {
  it("creates a stable compact id for very long magnet links", () => {
    const url = `magnet:?xt=urn:btih:${"a".repeat(40)}&tr=${"tracker".repeat(200)}`;
    const first = createSearchViewId("magnet", url);
    const second = createSearchViewId("magnet", url);

    expect(first).toBe(second);
    expect(first.length).toBeLessThan(64);
    expect(first).toMatch(/^magnet:[a-f0-9]{16}$/);
  });

  it("changes when the platform or url changes", () => {
    const url = "https://pan.example.com/s/example";
    expect(createSearchViewId("quark", url)).not.toBe(
      createSearchViewId("aliyun", url)
    );
    expect(createSearchViewId("quark", `${url}-2`)).not.toBe(
      createSearchViewId("quark", url)
    );
  });
});
