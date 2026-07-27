const RECENT_SEARCHES_KEY = "haosouku.recent-searches.v1";
const RECENT_SEARCH_LIMIT = 8;

export function useRecentSearches() {
  const items = useState<string[]>("recent-searches", () => []);
  const initialized = useState<boolean>("recent-searches-initialized", () => false);

  function persist() {
    if (import.meta.client) {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items.value));
    }
  }

  function load() {
    if (!import.meta.client || initialized.value) return;
    initialized.value = true;
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
      items.value = Array.isArray(stored)
        ? stored.filter((value): value is string => typeof value === "string" && value.trim()).slice(0, RECENT_SEARCH_LIMIT)
        : [];
    } catch {
      items.value = [];
    }
  }

  function add(value: string) {
    const keyword = value.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!keyword) return;
    items.value = [
      keyword,
      ...items.value.filter((item) => item.toLowerCase() !== keyword.toLowerCase()),
    ].slice(0, RECENT_SEARCH_LIMIT);
    persist();
  }

  function clear() {
    items.value = [];
    persist();
  }

  onMounted(load);
  return { recentSearches: computed(() => items.value), load, add, clear };
}
