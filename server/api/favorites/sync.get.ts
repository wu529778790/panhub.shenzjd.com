import { createError, defineEventHandler, getHeader, setHeader } from "h3";
import { getFavoritesDatabase } from "../../utils/cloudflareBindings";

const VAULT_ID_PATTERN = /^[a-f0-9]{64}$/;

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  const vaultId = String(getHeader(event, "x-vault-id") || "").toLowerCase();
  if (!VAULT_ID_PATTERN.test(vaultId)) {
    throw createError({ statusCode: 400, statusMessage: "invalid vault id" });
  }

  const database = getFavoritesDatabase(event);
  if (!database) {
    throw createError({
      statusCode: 503,
      statusMessage: "favorite sync is not configured",
    });
  }

  const row = await database
    .prepare(
      "SELECT payload, revision, updated_at FROM favorite_vaults WHERE vault_id = ?"
    )
    .bind(vaultId)
    .first<{ payload: string; revision: number; updated_at: number }>();

  return {
    code: 0,
    message: "success",
    data: row
      ? {
          payload: row.payload,
          revision: row.revision,
          updatedAt: row.updated_at,
        }
      : { payload: null, revision: 0, updatedAt: 0 },
  };
});
