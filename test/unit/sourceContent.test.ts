import { describe, expect, it } from "vitest";
import {
  classifyShareUrl,
  cleanResourceTitle,
  isStrictTitleMatch,
  normalizeCatalogUrl,
} from "../../utils/sourceContent";

describe("source content safeguards", () => {
  it("requires the actual keyword in live-source titles", () => {
    expect(isStrictTitleMatch("三体（2023）全30集", "三体")).toBe(true);
    expect(isStrictTitleMatch("格丽塞尔达", "塞尔达")).toBe(false);
    expect(isStrictTitleMatch("银河帝国全集", "三体")).toBe(false);
    expect(isStrictTitleMatch("The Three Body Problem 4K", "three body")).toBe(true);
    expect(
      isStrictTitleMatch(
        "These Three Slut Sisters With Hot Bodies Are Lusting For My Body",
        "three body"
      )
    ).toBe(false);
    expect(isStrictTitleMatch("Threesome Intense Body Licking", "three body")).toBe(false);
  });

  it("recognizes supported share links and deduplicates magnets by hash", () => {
    expect(classifyShareUrl("https://115cdn.com/s/abc?password=1234")).toBe("115");
    expect(classifyShareUrl("https://123pan.cn/s/abc?pwd=1234")).toBe("123");
    expect(classifyShareUrl("https://www.123685.com/s/abc")).toBe("123");
    expect(classifyShareUrl("https://123592.com/s/abc")).toBe("123");
    expect(classifyShareUrl("https://example.com/file")).toBeNull();
    expect(
      normalizeCatalogUrl(
        "magnet:?xt=urn:btih:43D59F11717C37635E0A6DB69367F4F21EE11E08&tr=udp://tracker"
      )
    ).toBe("magnet:43d59f11717c37635e0a6db69367f4f21ee11e08");
  });

  it("removes source promotion suffixes from titles", () => {
    expect(
      cleanResourceTitle("樊登讲书2026-超过100T资料总站网站-doc.869hr.uk")
    ).toBe("樊登讲书2026");
  });
});
