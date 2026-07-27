import {
  createError,
  defineEventHandler,
  getHeader,
  readBody,
  setHeader,
} from "h3";
import { getFavoritesDatabase } from "../../utils/cloudflareBindings";

const VAULT_ID_PATTERN = /^[a-f0-9]{64}$/;
const PAYLOAD_PATTERN = /^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22,}$/;
const MAX_PAYLOAD_BYTES = 300_000;

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  const contentLength = Number(getHeader(event, "content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_PAYLOAD_BYTES + 1_024) {
    throw createError({ statusCode: 413, statusMessage: "vault payload is too large" });
  }

  const vaultId = String(getHeader(event, "x-vault-id") || "").toLowerCase();
  if (!VAULT_ID_PATTERN.test(vaultId)) {
    throw createError({ statusCode: 400, statusMessage: "invalid vault id" });
  }

  const body = await readBody<{ payload?: unknown; revision?: unknown }>(event);
  const payload = typeof body?.payload === "string" ? body.payload : "";
  const expectedRevision = Number(body?.revision);
  if (
    !PAYLOAD_PATTERN.test(payload) ||
    new TextEncoder().encode(payload).byteLength > MAX_PAYLOAD_BYTES ||
    !Number.isInteger(expectedRevision) ||
    expectedRevision < 0
  ) {
    throw createError({ statusCode: 400, statusMessage: "invalid vault payload" });
  }

  const database = getFavoritesDatabase(event);
  if (!database) {
    throw createError({
      statusCode: 503,
      statusMessage: "favorite sync is not configured",
    });
  }

  const current = await database
    .prepare("SELECT revision FROM favorite_vaults WHERE vault_id = ?")
    .bind(vaultId)
    .first<{ revision: number }>();
  const currentRevision = current?.revision ?? 0;
  if (currentRevision !== expectedRevision) {
    throw createError({
      statusCode: 409,
      statusMessage: "favorite vault changed on another device",
      data: { revision: currentRevision },
    });
  }

  const nextRevision = currentRevision + 1;
  const now = Date.now();

  if (current) {
    const update = await database
      .prepare(
        `UPDATE favorite_vaults
         SET payload = ?, revision = ?, updated_at = ?
         WHERE vault_id = ? AND revision = ?`
      )
      .bind(payload, nextRevision, now, vaultId, currentRevision)
      .run();
    if ((update.meta?.changes ?? 0) !== 1) {
      throw createError({
        statusCode: 409,
        statusMessage: "favorite vault changed on another device",
      });
    }
  } else {
    try {
      await database
        .prepare(
          `INSERT INTO favorite_vaults
           (vault_id, payload, revision, updated_at)
           VALUES (?, ?, ?, ?)`
        )
        .bind(vaultId, payload, nextRevision, now)
        .run();
    } catch {
      throw createError({
        statusCode: 409,
        statusMessage: "favorite vault changed on another device",
      });
    }
  }

  return {
    code: 0,
    message: "success",
    data: { revision: nextRevision, updatedAt: now },
  };
});
