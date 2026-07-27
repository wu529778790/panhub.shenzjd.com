import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveMovieSearchAliases } from "../../server/core/services/movieSearchAliases";

describe("movie search aliases", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("resolves an English original title for a qualified Chinese query", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/api/v2/search")) {
        expect(url).toContain(encodeURIComponent("盗梦空间"));
        return Response.json({
          subjects: {
            items: [{ target: { id: "3541415", title: "盗梦空间" } }],
          },
        });
      }
      return Response.json({
        title: "盗梦空间",
        original_title: "Inception",
        aka: ["潜行凶间(港)", "全面启动(台)"],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const aliases = await resolveMovieSearchAliases("盗梦空间 2010 4K");

    expect(aliases[0]).toBe("Inception");
    expect(aliases).toContain("潜行凶间(港)");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not perform metadata lookups for non-Chinese queries", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveMovieSearchAliases("Inception 4K")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
