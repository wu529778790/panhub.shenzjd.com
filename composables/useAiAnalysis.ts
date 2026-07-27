import type {
  AiResourceAnalysis,
  SearchViewItem,
} from "~/types/search";

interface AiAnalysisResponse {
  code: number;
  message: string;
  data?: {
    items?: AiResourceAnalysis[];
  };
}

export function useAiAnalysis() {
  const analyses = useState<Record<string, AiResourceAnalysis>>(
    "ai-resource-analyses",
    () => ({})
  );
  const loading = useState<boolean>("ai-resource-loading", () => false);
  const error = useState<string>("ai-resource-error", () => "");
  const pendingIds = useState<Record<string, true>>(
    "ai-resource-pending-ids",
    () => ({})
  );
  let controller: AbortController | undefined;
  let requestVersion = 0;

  async function optimize(items: SearchViewItem[]): Promise<void> {
    const targets = items
      .filter((item) => !analyses.value[item.id])
      .slice(0, 16);
    if (targets.length === 0) return;

    controller?.abort();
    controller = new AbortController();
    const version = ++requestVersion;
    loading.value = true;
    error.value = "";
    pendingIds.value = Object.fromEntries(
      targets.map((item) => [item.id, true] as const)
    );

    try {
      const response = await $fetch<AiAnalysisResponse>("/api/ai/analyze", {
        method: "POST",
        body: {
          items: targets.map((item) => ({
            id: item.id,
            title: item.title,
            platform: item.type,
            datetime: item.datetime,
          })),
        },
        signal: controller.signal,
      });

      if (response.code !== 0 || !Array.isArray(response.data?.items)) {
        throw new Error(response.message || "AI 优化失败");
      }

      const next = { ...analyses.value };
      for (const item of response.data.items) next[item.id] = item;
      analyses.value = next;
    } catch (cause: any) {
      if (cause?.name !== "AbortError") {
        error.value =
          cause?.data?.statusMessage ||
          cause?.statusMessage ||
          cause?.message ||
          "AI 优化暂时不可用";
      }
    } finally {
      if (version === requestVersion) {
        loading.value = false;
        pendingIds.value = {};
      }
    }
  }

  function reset(): void {
    requestVersion += 1;
    controller?.abort();
    controller = undefined;
    loading.value = false;
    error.value = "";
    pendingIds.value = {};
    analyses.value = {};
  }

  return {
    analyses,
    loading,
    error,
    pendingIds,
    optimize,
    reset,
  };
}
