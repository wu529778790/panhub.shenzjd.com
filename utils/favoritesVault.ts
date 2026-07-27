import type {
  FavoriteItem,
  FavoriteVaultPayload,
} from "../types/favorites";

export const FAVORITE_TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const MAX_FAVORITE_ITEMS = 2_000;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  );
}

async function encryptionKey(syncKey: string): Promise<CryptoKey> {
  const bytes = await digest(`haosouku:encryption:${syncKey}`);
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export function createFavoriteSyncKey(): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(24)));
}

export function normalizeFavoriteSyncKey(value: string): string {
  const key = value.trim();
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(key)) {
    throw new Error("同步码不正确");
  }
  return key;
}

export async function favoriteVaultIdForKey(syncKey: string): Promise<string> {
  const bytes = await digest(`haosouku:vault:${normalizeFavoriteSyncKey(syncKey)}`);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function normalizeFavoriteItems(
  items: FavoriteItem[],
  now = Date.now()
): FavoriteItem[] {
  const cutoff = now - FAVORITE_TOMBSTONE_TTL_MS;
  const byUrl = new Map<string, FavoriteItem>();

  for (const raw of items) {
    if (!raw || typeof raw.url !== "string" || !raw.url.trim()) continue;

    const item: FavoriteItem = {
      url: raw.url.trim().slice(0, 2_048),
      title: String(raw.title || raw.url).trim().slice(0, 500),
      platform: String(raw.platform || "others").trim().slice(0, 40),
      password: raw.password
        ? String(raw.password).trim().slice(0, 40)
        : undefined,
      createdAt: Number(raw.createdAt) || now,
      updatedAt: Number(raw.updatedAt) || now,
      deletedAt: raw.deletedAt ? Number(raw.deletedAt) : undefined,
    };

    if (item.deletedAt && item.deletedAt < cutoff) continue;
    const previous = byUrl.get(item.url);
    if (!previous || item.updatedAt >= previous.updatedAt) {
      byUrl.set(item.url, item);
    }
  }

  return Array.from(byUrl.values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_FAVORITE_ITEMS);
}

export function mergeFavoriteItems(
  local: FavoriteItem[],
  remote: FavoriteItem[],
  now = Date.now()
): FavoriteItem[] {
  return normalizeFavoriteItems([...local, ...remote], now);
}

export async function encryptFavoritePayload(
  payload: FavoriteVaultPayload,
  syncKey: string
): Promise<string> {
  const key = normalizeFavoriteSyncKey(syncKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const normalized: FavoriteVaultPayload = {
    version: 1,
    items: normalizeFavoriteItems(payload.items),
  };
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(key),
    new TextEncoder().encode(JSON.stringify(normalized))
  );

  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(
    new Uint8Array(encrypted)
  )}`;
}

export async function decryptFavoritePayload(
  encrypted: string,
  syncKey: string
): Promise<FavoriteVaultPayload> {
  const [version, ivValue, contentValue, extra] = encrypted.split(".");
  if (version !== "v1" || !ivValue || !contentValue || extra) {
    throw new Error("收藏同步数据格式不正确");
  }

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(ivValue) },
      await encryptionKey(normalizeFavoriteSyncKey(syncKey)),
      base64UrlToBytes(contentValue)
    );
    const parsed = JSON.parse(new TextDecoder().decode(decrypted));
    if (parsed?.version !== 1 || !Array.isArray(parsed?.items)) {
      throw new Error("invalid payload");
    }
    return {
      version: 1,
      items: normalizeFavoriteItems(parsed.items),
    };
  } catch {
    throw new Error("同步码不正确或同步数据已损坏");
  }
}
