import type {
  FavoriteItem,
} from "~/types/favorites";
import type { SearchViewItem } from "~/types/search";
import {
  createFavoriteSyncKey,
  decryptFavoritePayload,
  encryptFavoritePayload,
  favoriteVaultIdForKey,
  mergeFavoriteItems,
  normalizeFavoriteItems,
  normalizeFavoriteSyncKey,
} from "~/utils/favoritesVault";

const FAVORITES_KEY = "haosouku.favorites.v1";
const SYNC_KEY = "haosouku.favorite-sync-key.v1";
export function useFavorites() {
  const items = useState<FavoriteItem[]>("favorite-items", () => []);
  const syncKey = useState<string>("favorite-sync-key", () => "");
  const initialized = useState<boolean>("favorite-initialized", () => false);
  const syncing = useState<boolean>("favorite-syncing", () => false);
  const syncError = useState<string>("favorite-sync-error", () => "");
  const lastSyncedAt = useState<number>("favorite-last-synced", () => 0);
  let syncTimer: ReturnType<typeof setTimeout> | undefined;

  const favorites = computed(() => items.value.filter((item) => !item.deletedAt));

  function persist(): void {
    if (!import.meta.client) return;
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(items.value));
  }

  function load(): void {
    if (!import.meta.client || initialized.value) return;
    initialized.value = true;
    try {
      const storedItems = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
      items.value = normalizeFavoriteItems(
        Array.isArray(storedItems) ? storedItems : []
      );
      syncKey.value = localStorage.getItem(SYNC_KEY) || "";
    } catch {
      items.value = [];
    }
    if (syncKey.value) void syncNow();
  }

  function isFavorite(url: string): boolean {
    return items.value.some((item) => item.url === url && !item.deletedAt);
  }

  function scheduleSync(): void {
    if (!syncKey.value) return;
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => void syncNow(), 700);
  }

  function toggleFavorite(resource: SearchViewItem): void {
    const now = Date.now();
    const existing = items.value.find((item) => item.url === resource.url);
    if (existing && !existing.deletedAt) {
      existing.deletedAt = now;
      existing.updatedAt = now;
    } else if (existing) {
      existing.deletedAt = undefined;
      existing.updatedAt = now;
      existing.title = resource.title;
      existing.platform = resource.type;
      existing.password = resource.password || undefined;
    } else {
      items.value.unshift({
        url: resource.url,
        title: resource.title,
        platform: resource.type,
        password: resource.password || undefined,
        createdAt: now,
        updatedAt: now,
      });
    }
    items.value = normalizeFavoriteItems(items.value);
    persist();
    scheduleSync();
  }

  function removeFavorite(url: string): void {
    const existing = items.value.find((item) => item.url === url);
    if (!existing || existing.deletedAt) return;
    const now = Date.now();
    existing.deletedAt = now;
    existing.updatedAt = now;
    items.value = normalizeFavoriteItems(items.value);
    persist();
    scheduleSync();
  }

  async function syncAttempt(key: string): Promise<void> {
    const vaultId = await favoriteVaultIdForKey(key);
    const remote = await $fetch<{
      code: number;
      data: { payload: string | null; revision: number };
    }>("/api/favorites/sync", {
      headers: { "x-vault-id": vaultId },
    });

    let merged = items.value;
    if (remote.data.payload) {
      const decrypted = await decryptFavoritePayload(remote.data.payload, key);
      merged = mergeFavoriteItems(items.value, decrypted.items);
    }

    const payload = await encryptFavoritePayload(
      { version: 1, items: merged },
      key
    );
    await $fetch("/api/favorites/sync", {
      method: "POST",
      headers: { "x-vault-id": vaultId },
      body: { payload, revision: remote.data.revision },
    });

    items.value = merged;
    persist();
  }

  async function syncNow(): Promise<void> {
    const key = syncKey.value.trim();
    if (!key || syncing.value) return;
    syncing.value = true;
    syncError.value = "";
    try {
      await syncAttempt(key);
      lastSyncedAt.value = Date.now();
    } catch (cause: any) {
      if (cause?.statusCode === 409 || cause?.status === 409) {
        try {
          await syncAttempt(key);
          lastSyncedAt.value = Date.now();
          return;
        } catch (retryCause: any) {
          cause = retryCause;
        }
      }
      syncError.value =
        cause?.data?.statusMessage ||
        cause?.statusMessage ||
        cause?.message ||
        "收藏同步失败";
    } finally {
      syncing.value = false;
    }
  }

  async function createSyncKey(): Promise<string> {
    const key = createFavoriteSyncKey();
    await connectSyncKey(key);
    return key;
  }

  async function connectSyncKey(value: string): Promise<void> {
    const key = normalizeFavoriteSyncKey(value);
    const previous = syncKey.value;
    syncKey.value = key;
    syncError.value = "";
    try {
      await syncNow();
      if (syncError.value) throw new Error(syncError.value);
      localStorage.setItem(SYNC_KEY, key);
    } catch (cause) {
      syncKey.value = previous;
      throw cause;
    }
  }

  function disconnectSync(): void {
    syncKey.value = "";
    syncError.value = "";
    localStorage.removeItem(SYNC_KEY);
  }

  onMounted(load);
  onBeforeUnmount(() => {
    if (syncTimer) clearTimeout(syncTimer);
  });

  return {
    favorites,
    syncKey,
    syncing,
    syncError,
    lastSyncedAt,
    load,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    syncNow,
    createSyncKey,
    connectSyncKey,
    disconnectSync,
  };
}
