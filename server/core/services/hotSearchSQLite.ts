import { HotSearchItem, HotSearchStats } from '../types/hot-search';

/**
 * 热搜服务 - 智能存储模式
 * 自动检测环境：支持 better-sqlite3 时使用 SQLite，否则降级到内存模式
 */

// 尝试导入 better-sqlite3，失败则使用内存模式
let Database: any = null;
let useSQLite = false;

try {
  // 动态导入，避免在不支持的环境报错
  Database = require('better-sqlite3');
  useSQLite = true;
  console.log('[HotSearchSQLite] ✅ SQLite 模式已启用');
} catch (error) {
  useSQLite = false;
  console.log('[HotSearchSQLite] ⚠️  better-sqlite3 不可用，降级到内存模式');
}

export class HotSearchSQLiteService {
  private db: any = null;
  private memoryStore: Map<string, HotSearchItem> | null = null;
  private readonly MAX_ENTRIES = 30;
  private isInitialized = false;
  private mode: 'sqlite' | 'memory' = useSQLite ? 'sqlite' : 'memory';

  constructor() {
    if (this.mode === 'sqlite') {
      this.initSQLite();
    } else {
      this.initMemory();
    }
  }

  /**
   * 初始化 SQLite 模式
   */
  private initSQLite(): void {
    try {
      this.db = new Database('hotsearch.db');
      this.db.pragma('journal_mode = WAL');

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS hot_searches (
          term TEXT PRIMARY KEY,
          score INTEGER NOT NULL DEFAULT 1,
          last_searched INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        )
      `);

      this.isInitialized = true;
      console.log('[HotSearchSQLite] ✅ SQLite 数据库已初始化');
    } catch (error) {
      console.error('[HotSearchSQLite] ❌ SQLite 初始化失败，降级到内存模式:', error);
      this.mode = 'memory';
      this.initMemory();
    }
  }

  /**
   * 初始化内存模式
   */
  private initMemory(): void {
    this.memoryStore = new Map<string, HotSearchItem>();
    this.isInitialized = true;
    console.log('[HotSearchSQLite] ✅ 内存模式已初始化');
  }

  /**
   * 记录搜索词（增加分数）
   */
  async recordSearch(term: string): Promise<void> {
    if (!term || term.trim().length === 0) return;

    // 违规词检查
    if (await this.isForbidden(term)) {
      console.log(`[HotSearchSQLite] 违规词被过滤: ${term}`);
      return;
    }

    const now = Date.now();

    if (this.mode === 'sqlite') {
      // SQLite 模式
      try {
        const existing = this.db.prepare('SELECT * FROM hot_searches WHERE term = ?').get(term);

        if (existing) {
          this.db.prepare('UPDATE hot_searches SET score = score + 1, last_searched = ? WHERE term = ?')
            .run(now, term);
        } else {
          this.db.prepare('INSERT INTO hot_searches (term, score, last_searched, created_at) VALUES (?, 1, ?, ?)')
            .run(term, now, now);
        }

        console.log(`[HotSearchSQLite] ✅ 记录搜索词: "${term}"`);
        this.cleanupOldEntries();
      } catch (error) {
        console.error('[HotSearchSQLite] ❌ SQLite 操作失败:', error);
      }
    } else {
      // 内存模式
      const existing = this.memoryStore!.get(term);

      if (existing) {
        existing.score += 1;
        existing.lastSearched = now;
      } else {
        this.memoryStore!.set(term, {
          term,
          score: 1,
          lastSearched: now,
          createdAt: now
        });
      }

      console.log(`[HotSearchSQLite] ✅ 记录搜索词: "${term}"`);
      this.cleanupOldEntries();
    }
  }

  /**
   * 获取热搜列表
   */
  async getHotSearches(limit: number = 30): Promise<HotSearchItem[]> {
    if (this.mode === 'sqlite') {
      // SQLite 模式
      try {
        const rows = this.db.prepare(`
          SELECT * FROM hot_searches
          ORDER BY score DESC, last_searched DESC
          LIMIT ?
        `).all(Math.min(limit, this.MAX_ENTRIES));

        return rows.map(row => ({
          term: row.term,
          score: row.score,
          lastSearched: row.last_searched,
          createdAt: row.created_at
        }));
      } catch (error) {
        console.error('[HotSearchSQLite] ❌ SQLite 查询失败:', error);
        return [];
      }
    } else {
      // 内存模式
      const entries = Array.from(this.memoryStore!.values());

      return entries
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return b.lastSearched - a.lastSearched;
        })
        .slice(0, Math.min(limit, this.MAX_ENTRIES));
    }
  }

  /**
   * 清理超出限制的旧记录
   */
  private cleanupOldEntries(): void {
    if (this.mode === 'sqlite') {
      // SQLite 模式 - 删除超出限制的记录
      try {
        const count = this.db.prepare('SELECT COUNT(*) as count FROM hot_searches').get().count;

        if (count > this.MAX_ENTRIES) {
          const toDelete = count - this.MAX_ENTRIES;
          this.db.prepare(`
            DELETE FROM hot_searches
            WHERE term IN (
              SELECT term FROM hot_searches
              ORDER BY score ASC, last_searched ASC
              LIMIT ?
            )
          `).run(toDelete);

          console.log(`[HotSearchSQLite] 清理旧记录: ${toDelete} 条`);
        }
      } catch (error) {
        console.error('[HotSearchSQLite] ❌ SQLite 清理失败:', error);
      }
    } else {
      // 内存模式
      if (this.memoryStore!.size <= this.MAX_ENTRIES) return;

      const entries = Array.from(this.memoryStore!.entries())
        .sort((a, b) => {
          if (b[1].score !== a[1].score) return b[1].score - a[1].score;
          return b[1].lastSearched - a[1].lastSearched;
        });

      // 删除超出限制的记录
      entries.slice(this.MAX_ENTRIES).forEach(([term]) => {
        this.memoryStore!.delete(term);
      });

      if (entries.length > this.MAX_ENTRIES) {
        console.log(`[HotSearchSQLite] 清理旧记录: ${entries.length - this.MAX_ENTRIES} 条`);
      }
    }
  }

  /**
   * 清除所有热搜记录（仅用于测试）
   */
  async clearHotSearches(): Promise<{ success: boolean; message: string }> {
    if (this.mode === 'sqlite') {
      try {
        this.db.exec('DELETE FROM hot_searches');
        return { success: true, message: '热搜记录已清除' };
      } catch (error) {
        return { success: false, message: '清除失败' };
      }
    } else {
      this.memoryStore!.clear();
      return { success: true, message: '热搜记录已清除' };
    }
  }

  /**
   * 删除指定热搜词（仅用于测试）
   */
  async deleteHotSearch(term: string): Promise<{ success: boolean; message: string }> {
    if (this.mode === 'sqlite') {
      try {
        const result = this.db.prepare('DELETE FROM hot_searches WHERE term = ?').run(term);

        if (result.changes > 0) {
          return { success: true, message: `热搜词 "${term}" 已删除` };
        } else {
          return { success: false, message: '热搜词不存在' };
        }
      } catch (error) {
        return { success: false, message: '删除失败' };
      }
    } else {
      const deleted = this.memoryStore!.delete(term);

      if (deleted) {
        return { success: true, message: `热搜词 "${term}" 已删除` };
      } else {
        return { success: false, message: '热搜词不存在' };
      }
    }
  }

  /**
   * 获取热搜统计信息
   */
  async getStats(): Promise<HotSearchStats> {
    if (this.mode === 'sqlite') {
      try {
        const total = this.db.prepare('SELECT COUNT(*) as count FROM hot_searches').get().count;

        const entries = this.db.prepare(`
          SELECT * FROM hot_searches
          ORDER BY score DESC, last_searched DESC
          LIMIT 10
        `).all().map(row => ({
          term: row.term,
          score: row.score,
          lastSearched: row.last_searched,
          createdAt: row.created_at
        }));

        return {
          total,
          topTerms: entries
        };
      } catch (error) {
        console.error('[HotSearchSQLite] ❌ SQLite 统计查询失败:', error);
        return { total: 0, topTerms: [] };
      }
    } else {
      const entries = Array.from(this.memoryStore!.values())
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return b.lastSearched - a.lastSearched;
        })
        .slice(0, 10);

      return {
        total: this.memoryStore!.size,
        topTerms: entries
      };
    }
  }

  /**
   * 获取数据库大小
   */
  getDatabaseSize(): number {
    if (this.mode === 'sqlite') {
      try {
        const result = this.db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get();
        return result ? result.size : 0;
      } catch (error) {
        return 0;
      }
    } else {
      return 0;
    }
  }

  /**
   * 获取当前模式
   */
  getMode(): string {
    return this.mode;
  }

  /**
   * 违规词检查（简化版）
   */
  private async isForbidden(term: string): Promise<boolean> {
    const forbiddenPatterns = [
      /政治|暴力|色情|赌博|毒品/i,
      /fuck|shit|bitch/i,
    ];

    return forbiddenPatterns.some(pattern => pattern.test(term));
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.mode === 'sqlite' && this.db) {
      this.db.close();
      console.log('[HotSearchSQLite] ✅ SQLite 连接已关闭');
    }
  }
}

// 单例模式
let singleton: HotSearchSQLiteService | undefined;

export function getOrCreateHotSearchSQLiteService(): HotSearchSQLiteService {
  if (!singleton) {
    singleton = new HotSearchSQLiteService();
  }
  return singleton;
}
