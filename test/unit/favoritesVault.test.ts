import { describe, expect, it } from "vitest";
import type { FavoriteItem } from "../../types/favorites";
import {
  FAVORITE_TOMBSTONE_TTL_MS,
  createFavoriteSyncKey,
  decryptFavoritePayload,
  encryptFavoritePayload,
  favoriteVaultIdForKey,
  mergeFavoriteItems,
  normalizeFavoriteItems,
  normalizeFavoriteSyncKey,
} from "../../utils/favoritesVault";

function favorite(overrides: Partial<FavoriteItem> = {}): FavoriteItem {
  return {
    url: "https://pan.example.com/s/example",
    title: "测试资源",
    platform: "quark",
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  };
}

describe("favorites vault", () => {
  it("creates a valid high-entropy sync key and stable vault id", async () => {
    const key = createFavoriteSyncKey();
    expect(normalizeFavoriteSyncKey(key)).toBe(key);
    expect(key).toMatch(/^[A-Za-z0-9_-]{32}$/);

    const first = await favoriteVaultIdForKey(key);
    const second = await favoriteVaultIdForKey(key);
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it("encrypts and decrypts without exposing plaintext", async () => {
    const key = createFavoriteSyncKey();
    const payload = { version: 1 as const, items: [favorite()] };
    const encrypted = await encryptFavoritePayload(payload, key);

    expect(encrypted).toMatch(/^v1\./);
    expect(encrypted).not.toContain("测试资源");
    await expect(decryptFavoritePayload(encrypted, key)).resolves.toEqual(payload);
  });

  it("rejects a different sync key", async () => {
    const encrypted = await encryptFavoritePayload(
      { version: 1, items: [favorite()] },
      createFavoriteSyncKey()
    );

    await expect(
      decryptFavoritePayload(encrypted, createFavoriteSyncKey())
    ).rejects.toThrow("同步码不正确或同步数据已损坏");
  });

  it("keeps the newest version so deletions synchronize", () => {
    const active = favorite({ updatedAt: 2_000 });
    const deleted = favorite({ updatedAt: 3_000, deletedAt: 3_000 });

    expect(mergeFavoriteItems([active], [deleted], 4_000)).toEqual([deleted]);
  });

  it("removes expired tombstones and normalizes duplicate urls", () => {
    const now = FAVORITE_TOMBSTONE_TTL_MS + 10_000;
    const expired = favorite({
      url: "https://pan.example.com/s/deleted",
      updatedAt: 1,
      deletedAt: 1,
    });
    const older = favorite({ title: "旧标题", updatedAt: 2_000 });
    const newer = favorite({ title: "新标题", updatedAt: 3_000 });

    expect(normalizeFavoriteItems([expired, newer, older], now)).toEqual([
      newer,
    ]);
  });
});
