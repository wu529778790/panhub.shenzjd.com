import { HotSearchItem, HotSearchStats } from '../types/hot-search';

/**
 * 热搜服务 - 内存存储模式
 * 使用纯内存存储，兼容所有部署环境（Vercel、Cloudflare、Docker 等）
 */
export class HotSearchSQLiteService {
  private memoryStore = new Map<string, HotSearchItem>();
  private readonly MAX_ENTRIES = 30;
  private isInitialized = true; // 内存模式立即可用

  constructor() {
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
    const existing = this.memoryStore.get(term);

    if (existing) {
      // 更新现有记录
      existing.score += 1;
      existing.lastSearched = now;
    } else {
      // 插入新记录
      this.memoryStore.set(term, {
        term,
        score: 1,
        lastSearched: now,
        createdAt: now
      });
    }

    console.log(`[HotSearchSQLite] ✅ 记录搜索词: "${term}"`);

    // 清理超出限制的记录
    this.cleanupOldEntries();
  }

  /**
   * 获取热搜列表
   */
  async getHotSearches(limit: number = 30): Promise<HotSearchItem[]> {
    const entries = Array.from(this.memoryStore.values());

    return entries
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.lastSearched - a.lastSearched;
      })
      .slice(0, Math.min(limit, this.MAX_ENTRIES));
  }

  /**
   * 清理超出限制的旧记录
   */
  private cleanupOldEntries(): void {
    if (this.memoryStore.size <= this.MAX_ENTRIES) return;

    const entries = Array.from(this.memoryStore.entries())
      .sort((a, b) => {
        if (b[1].score !== a[1].score) return b[1].score - a[1].score;
        return b[1].lastSearched - a[1].lastSearched;
      });

    // 删除超出限制的记录
    entries.slice(this.MAX_ENTRIES).forEach(([term]) => {
      this.memoryStore.delete(term);
    });

    if (entries.length > this.MAX_ENTRIES) {
      console.log(`[HotSearchSQLite] 清理旧记录: ${entries.length - this.MAX_ENTRIES} 条`);
    }
  }

  /**
   * 清除所有热搜记录（仅用于测试）
   */
  async clearHotSearches(): Promise<{ success: boolean; message: string }> {
    this.memoryStore.clear();
    return { success: true, message: '热搜记录已清除' };
  }

  /**
   * 删除指定热搜词（仅用于测试）
   */
  async deleteHotSearch(term: string): Promise<{ success: boolean; message: string }> {
    const deleted = this.memoryStore.delete(term);

    if (deleted) {
      return { success: true, message: `热搜词 "${term}" 已删除` };
    } else {
      return { success: false, message: '热搜词不存在' };
    }
  }

  /**
   * 获取热搜统计信息
   */
  async getStats(): Promise<HotSearchStats> {
    const entries = Array.from(this.memoryStore.values())
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.lastSearched - a.lastSearched;
      })
      .slice(0, 10);

    return {
      total: this.memoryStore.size,
      topTerms: entries
    };
  }

  /**
   * 获取数据库大小（内存模式返回 0）
   */
  getDatabaseSize(): number {
    return 0;
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
   * 关闭数据库连接（内存模式无需操作）
   */
  close(): void {
    // 内存模式无需关闭
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
