import { describe, expect, it } from "vitest";
import channelsConfig from "../../config/channels.json";
import { ALL_PLUGIN_NAMES } from "../../config/plugins";
import { buildSearchTaskPlan } from "../../utils/searchTaskPlan";

describe("search task plan", () => {
  it("keeps the fast catalog and magnetic sources independent", () => {
    const plan = buildSearchTaskPlan(
      ["精选资料库", "好搜聚合", "nyaa", "全网索引"],
      [],
      [],
      16
    );

    expect(plan.pluginGroups).toEqual([
      ["精选资料库"],
      ["nyaa"],
      ["好搜聚合", "全网索引"],
    ]);
    expect(plan.requestCount).toBe(3);
  });

  it("isolates productive live sources from slower supplemental sources", () => {
    const plan = buildSearchTaskPlan(
      [
        "精选资料库",
        "网络资源索引",
        "影视速搜",
        "影视直达",
        "好搜聚合",
        "solidtorrents",
      ],
      [],
      [],
      16
    );

    expect(plan.pluginGroups).toEqual([
      ["精选资料库"],
      ["网络资源索引", "影视速搜", "影视直达"],
      ["solidtorrents"],
      ["好搜聚合"],
    ]);
  });

  it("schedules priority Telegram channels before deep batches", () => {
    const plan = buildSearchTaskPlan(
      [],
      ["deep-1", "priority-1", "deep-2", "priority-2", "deep-3"],
      ["priority-1", "priority-2"],
      2
    );

    expect(plan.priorityChannelBatches).toEqual([
      ["priority-1", "priority-2"],
    ]);
    expect(plan.deepChannelBatches).toEqual([
      ["deep-1", "deep-2"],
      ["deep-3"],
    ]);
    expect(plan.requestCount).toBe(3);
  });

  it("deduplicates settings migrated from older source lists", () => {
    const plan = buildSearchTaskPlan(
      ["精选资料库", "精选资料库", "好搜聚合"],
      ["priority", "priority", "deep"],
      ["priority"],
      16
    );

    expect(plan.pluginGroups).toEqual([
      ["精选资料库"],
      ["好搜聚合"],
    ]);
    expect(plan.priorityChannelBatches).toEqual([["priority"]]);
    expect(plan.deepChannelBatches).toEqual([["deep"]]);
    expect(plan.requestCount).toBe(4);
  });

  it("keeps the default full search within twelve Worker requests", () => {
    const plan = buildSearchTaskPlan(
      [...ALL_PLUGIN_NAMES],
      channelsConfig.defaultChannels,
      channelsConfig.priorityChannels,
      16
    );

    expect(ALL_PLUGIN_NAMES).toContain("网络资源索引");
    expect(channelsConfig.defaultChannels).not.toContain("Quark_Movies");
    expect(plan.pluginGroups).toHaveLength(6);
    expect(plan.priorityChannelBatches).toHaveLength(2);
    expect(plan.deepChannelBatches).toHaveLength(4);
    expect(plan.requestCount).toBe(12);
  });
});
