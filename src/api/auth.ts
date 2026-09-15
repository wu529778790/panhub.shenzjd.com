/**
 * 认证模块 - 已移除微信认证
 * 
 * 该模块保留了基础的认证状态管理接口，
 * 但不再强制进行微信登录认证。
 */

import { ref } from "vue";

// ===== 认证状态（模块级单例，跨组件共享） =====

export const isVerified = ref(true); // 默认视为已认证
export const isReady = ref(true);

/**
 * 应用启动时调用：初始化认证。
 * 由于已移除微信认证，此函数为空操作。
 */
export function initAuth(): void {
  // 认证初始化已禁用
}

/**
 * 每次搜索前调用：检查认证状态。
 * 由于已移除微信认证，始终返回 true（已认证）。
 */
export async function checkSearchAuth(): Promise<boolean> {
  return true;
}

/**
 * 当认证失败时调用：重新验证。
 * 由于已移除微信认证，始终返回 true（已认证）。
 */
export async function forceVerify(): Promise<boolean> {
  return true;
}
