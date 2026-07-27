import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { spawnSync } from "node:child_process";

const projectRoot = new URL("..", import.meta.url).pathname;
const sizeOption = process.argv.find((argument) => argument.startsWith("--sizes="));
const sizes = (sizeOption?.split("=")[1] || "100000,500000,1000000")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isInteger(value) && value > 0)
  .sort((left, right) => left - right);
const keepState = process.argv.includes("--keep");
const stateDirectory = mkdtempSync(join(tmpdir(), "haosouku-d1-benchmark-"));

if (!sizes.length) {
  throw new Error("--sizes 至少需要一个正整数");
}

function parseJsonOutput(output) {
  const start = output.indexOf("[");
  const end = output.lastIndexOf("]");
  if (start < 0 || end < start) throw new Error(`无法解析 Wrangler 输出: ${output}`);
  return JSON.parse(output.slice(start, end + 1));
}

function execute(sql, label) {
  const startedAt = performance.now();
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "wrangler",
      "d1",
      "execute",
      "haosouku-data",
      "--local",
      "--persist-to",
      stateDirectory,
      "--command",
      sql,
      "--json",
    ],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1" },
      maxBuffer: 64 * 1024 * 1024,
    }
  );
  const wallMs = Math.round((performance.now() - startedAt) * 100) / 100;
  if (result.status !== 0) {
    throw new Error(`${label} 失败\n${result.stderr || result.stdout}`);
  }
  const payload = parseJsonOutput(result.stdout);
  const engineMs = payload.reduce(
    (sum, item) => sum + Number(item?.meta?.duration || 0),
    0
  );
  return {
    label,
    wallMs,
    engineMs: Math.round(engineMs * 100) / 100,
    results: payload.flatMap((item) => item?.results || []),
  };
}

const setupSql = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE resource_catalog (
    normalized_url TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    type TEXT NOT NULL,
    password TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'unknown',
    first_seen_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL
  );
  CREATE INDEX idx_resource_catalog_type_status
    ON resource_catalog (type, status, last_seen_at DESC);
  CREATE INDEX idx_resource_catalog_title ON resource_catalog (title);
  CREATE VIRTUAL TABLE resource_catalog_fts USING fts5(
    normalized_url UNINDEXED,
    title,
    category,
    content = 'resource_catalog',
    content_rowid = 'rowid',
    tokenize = 'trigram'
  );
  CREATE TRIGGER resource_catalog_fts_insert
  AFTER INSERT ON resource_catalog BEGIN
    INSERT INTO resource_catalog_fts(rowid, normalized_url, title, category)
    VALUES (new.rowid, new.normalized_url, new.title, new.category);
  END;
  CREATE TRIGGER resource_catalog_fts_delete
  AFTER DELETE ON resource_catalog BEGIN
    INSERT INTO resource_catalog_fts(
      resource_catalog_fts, rowid, normalized_url, title, category
    ) VALUES ('delete', old.rowid, old.normalized_url, old.title, old.category);
  END;
  CREATE TRIGGER resource_catalog_fts_update
  AFTER UPDATE OF normalized_url, title, category ON resource_catalog BEGIN
    INSERT INTO resource_catalog_fts(
      resource_catalog_fts, rowid, normalized_url, title, category
    ) VALUES ('delete', old.rowid, old.normalized_url, old.title, old.category);
    INSERT INTO resource_catalog_fts(rowid, normalized_url, title, category)
    VALUES (new.rowid, new.normalized_url, new.title, new.category);
  END;
`;

const rows = [];
let currentSize = 0;

try {
  execute(setupSql, "初始化");
  for (const targetSize of sizes) {
    if (targetSize <= currentSize) continue;
    const insert = execute(
      `WITH RECURSIVE seq(i) AS (
         SELECT ${currentSize + 1}
         UNION ALL SELECT i + 1 FROM seq WHERE i < ${targetSize}
       )
       INSERT INTO resource_catalog
         (normalized_url, url, type, password, title, category, status,
          first_seen_at, last_seen_at)
       SELECT
         'https://pan.example/s/' || i,
         'https://pan.example/s/' || i,
         CASE i % 6 WHEN 0 THEN '115' WHEN 1 THEN 'quark'
              WHEN 2 THEN 'baidu' WHEN 3 THEN 'aliyun'
              WHEN 4 THEN 'xunlei' ELSE '123' END,
         '',
         CASE i % 10 WHEN 0 THEN '三体 4K 合集 ' || i
              WHEN 1 THEN '肖申克的救赎 ' || i
              WHEN 2 THEN 'Python 入门课程 ' || i
              ELSE '公开资源标题 ' || i END,
         CASE i % 4 WHEN 0 THEN '影视' WHEN 1 THEN '课程'
              WHEN 2 THEN '电子书' ELSE '综合资源' END,
         CASE i % 97 WHEN 0 THEN 'dead' ELSE 'unknown' END,
         1784746458000 - i,
         1784746458000 - i
       FROM seq;`,
      `${targetSize} 行写入`
    );
    currentSize = targetSize;

    const integrity = execute(
      `SELECT
         (SELECT COUNT(*) FROM resource_catalog) AS catalog_count,
         (SELECT COUNT(*) FROM resource_catalog_fts) AS fts_count;`,
      `${targetSize} 行索引一致性`
    );
    const countRow = integrity.results[0] || {};
    if (Number(countRow.catalog_count) !== Number(countRow.fts_count)) {
      throw new Error(
        `${targetSize} 行 FTS 不一致: catalog=${countRow.catalog_count}, fts=${countRow.fts_count}`
      );
    }

    const exact = execute(
      `SELECT normalized_url FROM resource_catalog
       WHERE normalized_url = 'https://pan.example/s/${Math.floor(targetSize / 2)}';`,
      `${targetSize} 行精确链接`
    );
    const fullText = execute(
      `SELECT c.normalized_url
       FROM resource_catalog_fts
       JOIN resource_catalog c ON c.rowid = resource_catalog_fts.rowid
       WHERE resource_catalog_fts MATCH '"三体"' AND c.status <> 'dead'
       ORDER BY bm25(resource_catalog_fts), c.last_seen_at DESC
       LIMIT 120;`,
      `${targetSize} 行 FTS`
    );
    const filtered = execute(
      `SELECT c.normalized_url
       FROM resource_catalog_fts
       JOIN resource_catalog c ON c.rowid = resource_catalog_fts.rowid
       WHERE resource_catalog_fts MATCH '"Python"'
         AND c.status <> 'dead' AND c.type IN ('115', 'quark')
       ORDER BY bm25(resource_catalog_fts), c.last_seen_at DESC
       LIMIT 120;`,
      `${targetSize} 行过滤 FTS`
    );
    const triggerUpdate = execute(
      `UPDATE resource_catalog SET title = title || ' 已复检'
       WHERE rowid IN (
         SELECT rowid FROM resource_catalog
         WHERE rowid > ${Math.max(0, targetSize - 1000)} LIMIT 1000
       );`,
      `${targetSize} 行触发器更新`
    );

    for (const result of [insert, integrity, exact, fullText, filtered, triggerUpdate]) {
      rows.push({
        rows: targetSize.toLocaleString("zh-CN"),
        operation: result.label.replace(`${targetSize} 行`, ""),
        engineMs: result.engineMs,
        wallMs: result.wallMs,
        status:
          result.label.includes("写入") || result.engineMs <= 100 ? "通过" : "关注",
      });
    }
  }

  console.table(rows);
  console.log(`FTS 索引一致性通过，已验证容量: ${sizes.join(", ")} 行`);
  console.log("说明: engineMs 来自本地 D1 执行元数据，wallMs 包含 Wrangler 启动时间。");
} finally {
  if (keepState) {
    console.log(`本地基准数据保留在 ${stateDirectory}`);
  } else {
    rmSync(stateDirectory, { recursive: true, force: true });
  }
}
