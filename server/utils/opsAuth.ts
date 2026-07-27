import { createError, getHeader } from "h3";

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  );
}

async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const [leftDigest, rightDigest] = await Promise.all([
    digest(left),
    digest(right),
  ]);
  let difference = 0;
  for (let index = 0; index < leftDigest.length; index += 1) {
    difference |= leftDigest[index] ^ rightDigest[index];
  }
  return difference === 0;
}

export async function requireOpsToken(event: any): Promise<void> {
  const configured = String(useRuntimeConfig(event).opsToken || "");
  const supplied = String(getHeader(event, "x-ops-token") || "");
  if (
    !configured ||
    !supplied ||
    !(await constantTimeEqual(configured, supplied))
  ) {
    throw createError({
      statusCode: 401,
      statusMessage: "需要运营后台访问密钥",
    });
  }
}
