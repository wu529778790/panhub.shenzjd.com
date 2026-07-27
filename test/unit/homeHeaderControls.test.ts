import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("home header controls", () => {
  it("hides the search settings entry on the home route", () => {
    const app = readFileSync(
      new URL("../../app.vue", import.meta.url),
      "utf8"
    );

    expect(app).toContain(`v-if="!isHomeRoute"`);
    expect(app).toContain(`requestUrl.pathname : route.path`);
    expect(app).toContain(`aria-label="打开搜索设置"`);
  });
});
