interface ServiceFetcher {
  fetch(request: Request): Promise<Response>;
}

interface WorkersAiBindingLike {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

interface VectorizeBindingLike {
  query(
    vector: number[],
    options: Record<string, unknown>
  ): Promise<{ matches?: Array<{ id: string; score?: number }> }>;
}

export interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  run(): Promise<{ success?: boolean; meta?: { changes?: number } }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1StatementLike;
  batch?(statements: D1StatementLike[]): Promise<unknown[]>;
}

export function getCloudflareEnv(event: any): Record<string, any> {
  return (
    event?.context?.cloudflare?.env ||
    event?.context?.cloudflare?.platform?.env ||
    event?.context?.platform?.env ||
    {}
  );
}

function getPansouFetcher(event: any): ServiceFetcher | undefined {
  const env = getCloudflareEnv(event);
  const candidates = [env.PANSOU];

  return candidates.find(
    (candidate) => candidate && typeof candidate.fetch === "function"
  );
}

export function getFavoritesDatabase(event: any): D1DatabaseLike | undefined {
  const database = getCloudflareEnv(event).FAVORITES_DB;
  return database && typeof database.prepare === "function"
    ? (database as D1DatabaseLike)
    : undefined;
}

export const getLinkHealthDatabase = getFavoritesDatabase;
export const getResourceDatabase = getFavoritesDatabase;

export function getWorkersAiBinding(
  event: any
): WorkersAiBindingLike | undefined {
  const binding = getCloudflareEnv(event).AI;
  return binding && typeof binding.run === "function"
    ? (binding as WorkersAiBindingLike)
    : undefined;
}

export function getGeoVectorBinding(
  event: any
): VectorizeBindingLike | undefined {
  const binding = getCloudflareEnv(event).GEO_VECTOR;
  return binding && typeof binding.query === "function"
    ? (binding as VectorizeBindingLike)
    : undefined;
}

export function deferCloudflareTask(
  event: any,
  promise: Promise<unknown>
): boolean {
  const candidates = [
    event?.context?.cloudflare?.context,
    event?.context?.cloudflare?.ctx,
    event?.context,
  ];
  const executionContext = candidates.find(
    (candidate) => candidate && typeof candidate.waitUntil === "function"
  );
  if (!executionContext) return false;
  executionContext.waitUntil(promise);
  return true;
}

export function attachCloudflareBindings(
  event: any,
  ext: Record<string, any> | undefined
): Record<string, any> {
  const fetcher = getPansouFetcher(event);
  const database = getResourceDatabase(event);
  return {
    ...(ext || {}),
    ...(fetcher ? { __pansou_fetcher: fetcher } : {}),
    ...(database ? { __resource_database: database } : {}),
  };
}
