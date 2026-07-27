import type {
  LinkHealthInfo,
  LinkHealthReportStatus,
} from "~/utils/linkHealth";
import { linkHealthKey } from "~/utils/linkHealth";

interface LinkHealthResponse {
  data?: { items?: LinkHealthInfo[] };
}

export function useLinkHealth() {
  const runtimeConfig = useRuntimeConfig();
  const apiBase = (runtimeConfig.public?.apiBase as string) || "/api";
  const healthByUrl = ref<Record<string, LinkHealthInfo>>({});
  const loadedUrls = new Set<string>();
  const pendingUrls = new Set<string>();

  function apply(items: LinkHealthInfo[]) {
    if (!Array.isArray(items) || items.length === 0) return;
    const next = { ...healthByUrl.value };
    for (const item of items) {
      if (!item?.normalizedUrl) continue;
      next[item.normalizedUrl] = item;
      loadedUrls.add(item.normalizedUrl);
      pendingUrls.delete(item.normalizedUrl);
    }
    healthByUrl.value = next;
  }

  function get(url: string): LinkHealthInfo | undefined {
    return healthByUrl.value[linkHealthKey(url)];
  }

  async function load(urls: string[]) {
    const fresh = Array.from(
      new Set(urls.map(linkHealthKey).filter((url) => url.startsWith("http")))
    ).filter((url) => !loadedUrls.has(url) && !pendingUrls.has(url));
    if (fresh.length === 0) return;

    for (let index = 0; index < fresh.length; index += 100) {
      const batch = fresh.slice(index, index + 100);
      batch.forEach((url) => pendingUrls.add(url));
      try {
        const response = await $fetch<LinkHealthResponse>(`${apiBase}/link-health/query`, {
          method: "POST",
          body: { urls: batch },
        });
        apply(response.data?.items || []);
        batch.forEach((url) => loadedUrls.add(url));
      } catch {
      } finally {
        batch.forEach((url) => pendingUrls.delete(url));
      }
    }
  }

  async function report(url: string, status: LinkHealthReportStatus) {
    const response = await $fetch<LinkHealthResponse>(`${apiBase}/link-health/report`, {
      method: "POST",
      body: { reports: [{ url, status }] },
    });
    const items = response.data?.items || [];
    apply(items);
    return items[0];
  }

  function reset() {
    healthByUrl.value = {};
    loadedUrls.clear();
    pendingUrls.clear();
  }

  function handleMessage(event: MessageEvent) {
    if (event.source !== window || event.origin !== window.location.origin) return;
    if (event.data?.type !== "haosouku:link-health") return;
    apply(Array.isArray(event.data.items) ? event.data.items : []);
  }

  onMounted(() => window.addEventListener("message", handleMessage));
  onBeforeUnmount(() => window.removeEventListener("message", handleMessage));

  return { healthByUrl, get, load, report, reset };
}
