import { describe, expect, it } from "vitest";
import {
  classifyAutomaticLinkResponse,
  classifyQuarkShareTokenResponse,
  confirmAutomaticLinkDecision,
  nextAutomaticCheckDelayMs,
} from "../../utils/autoLinkHealth";

describe("automatic link health classification", () => {
  it("confirms explicit invalid pages and HTTP removals", () => {
    expect(classifyAutomaticLinkResponse(404, "").status).toBe("dead");
    expect(
      classifyAutomaticLinkResponse(200, "来晚了，该分享文件已取消")
    ).toMatchObject({ status: "dead", reason: "explicit_invalid_page" });
  });

  it("ignores invalid-message strings that only exist inside application scripts", () => {
    expect(
      classifyAutomaticLinkResponse(
        200,
        "<html><script>const messages = ['文件不存在']</script><main>加载中</main></html>"
      ).status
    ).toBe("unknown");
  });

  it("does not misclassify access restrictions as dead", () => {
    expect(classifyAutomaticLinkResponse(403, "Forbidden").status).toBe(
      "suspect"
    );
    expect(classifyAutomaticLinkResponse(429, "Too many requests").status).toBe(
      "suspect"
    );
    expect(
      classifyAutomaticLinkResponse(200, "Just a moment... cf-chl-bypass")
        .status
    ).toBe("suspect");
  });

  it("recognizes password and visible share pages", () => {
    expect(classifyAutomaticLinkResponse(200, "请输入提取码").status).toBe(
      "password"
    );
    expect(classifyAutomaticLinkResponse(200, "分享文件 文件列表").status).toBe(
      "alive"
    );
  });

  it("uses Quark's token endpoint to distinguish live and missing shares", () => {
    expect(
      classifyQuarkShareTokenResponse(
        200,
        JSON.stringify({ code: 0, data: { stoken: "token" } })
      )
    ).toMatchObject({ status: "alive", reason: "quark_token_valid" });
    expect(
      classifyQuarkShareTokenResponse(
        200,
        JSON.stringify({ status: 404, code: 41006, message: "分享不存在" })
      )
    ).toMatchObject({ status: "dead", reason: "quark_share_missing" });
    expect(
      classifyQuarkShareTokenResponse(
        200,
        JSON.stringify({ code: 41011, message: "提取码错误" })
      ).status
    ).toBe("password");
  });

  it("rechecks uncertain links sooner than confirmed links", () => {
    expect(nextAutomaticCheckDelayMs("suspect")).toBeLessThan(
      nextAutomaticCheckDelayMs("alive")
    );
    expect(nextAutomaticCheckDelayMs("dead")).toBeGreaterThan(
      nextAutomaticCheckDelayMs("alive")
    );
  });

  it("requires two separate explicit failures before confirming death", () => {
    const directFailure = classifyAutomaticLinkResponse(404, "");
    const first = confirmAutomaticLinkDecision(0, directFailure);
    const second = confirmAutomaticLinkDecision(first.failureStreak, directFailure);

    expect(first).toMatchObject({
      failureStreak: 1,
      decision: { status: "suspect" },
    });
    expect(second).toMatchObject({
      failureStreak: 2,
      decision: { status: "dead" },
    });
    expect(
      confirmAutomaticLinkDecision(1, {
        status: "suspect",
        reason: "rate_limited",
        confidence: 10,
      }).failureStreak
    ).toBe(1);
  });
});
