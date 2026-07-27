export interface SearchTaskPlan {
  pluginGroups: string[][];
  priorityChannelBatches: string[][];
  deepChannelBatches: string[][];
  requestCount: number;
}

function unique(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
}

function batches(values: string[], size: number): string[][] {
  const result: string[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

/**
 * Keep the fastest catalog source independent for early rendering, combine
 * productive live sources separately from slower supplemental sources, and
 * postpone non-priority Telegram channels.
 */
export function buildSearchTaskPlan(
  enabledPlugins: string[],
  enabledTgChannels: string[],
  priorityChannels: string[],
  batchSize: number,
  fastPluginNames: string[] = ["精选资料库"],
  productivePluginNames: string[] = [
    "网络资源索引",
    "影视速搜",
    "影视直达",
  ],
  isolatedPluginNames: string[] = [
    "磁力索引",
    "nyaa",
    "solidtorrents",
  ]
): SearchTaskPlan {
  const plugins = unique(enabledPlugins);
  const fastNames = new Set(fastPluginNames);
  const fastPlugins = plugins.filter((name) => fastNames.has(name));
  const productiveNames = new Set(productivePluginNames);
  const productivePlugins = plugins.filter(
    (name) => !fastNames.has(name) && productiveNames.has(name)
  );
  const isolatedNames = new Set(isolatedPluginNames);
  const isolatedPlugins = plugins.filter((name) => isolatedNames.has(name));
  const remainingPlugins = plugins.filter(
    (name) =>
      !fastNames.has(name) &&
      !productiveNames.has(name) &&
      !isolatedNames.has(name)
  );
  const pluginGroups = [
    fastPlugins,
    productivePlugins,
    ...isolatedPlugins.map((name) => [name]),
    remainingPlugins,
  ].filter((group) => group.length > 0);

  const channels = unique(enabledTgChannels);
  const priorityNames = new Set(priorityChannels);
  const priority = channels.filter((name) => priorityNames.has(name));
  const deep = channels.filter((name) => !priorityNames.has(name));
  const safeBatchSize = Math.max(1, Math.floor(batchSize));
  const priorityChannelBatches = batches(priority, safeBatchSize);
  const deepChannelBatches = batches(deep, safeBatchSize);

  return {
    pluginGroups,
    priorityChannelBatches,
    deepChannelBatches,
    requestCount:
      pluginGroups.length +
      priorityChannelBatches.length +
      deepChannelBatches.length,
  };
}
