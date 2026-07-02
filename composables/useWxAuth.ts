/**
 * 微信公众号认证 composable
 * - 前 3 次搜索免费，第 4 次起弹出认证提示
 * - 已认证用户（cookie 存在且有效）永不弹窗
 * - 用户关闭弹窗后搜索正常进行，下次搜索再弹
 *
 * 依赖 wx-auth-sdk@1.2.8+ 的 silent 选项：init({ silent: true }) 只做
 * cookie 静默验证（有效 => onVerified，无效 => 删 cookie），不自动弹窗。
 * 弹窗时机由 checkSearchAuth() / showAuthModal() 手动控制。
 */

import { WxAuth } from "wx-auth-sdk";
import "wx-auth-sdk/dist/style.css";

const SEARCH_COUNT_KEY = "wx_auth_search_count";
const FREE_SEARCHES = 3;

export function useWxAuth() {
  const isVerified = ref(false);
  const isReady = ref(false);

  // 仅在客户端初始化
  onBeforeMount(() => {
    if (typeof window === "undefined") return;

    // silent: true —— init 内的 autoCheck 不会弹窗，只静默验证 cookie
    WxAuth.init({
      apiBase: "https://wx-auth.shenzjd.com",
      silent: true,
      onVerified: (user: any) => {
        console.log("[wx-auth] 认证成功", user);
        isVerified.value = true;
        isReady.value = true;
      },
      onError: (error: any) => {
        console.error("[wx-auth] 认证失败", error);
      },
      onClose: () => {
        console.log("[wx-auth] 弹窗关闭");
      },
    });

    // silent 模式下 init 不返回 Promise，需手动标记 ready。
    // 若 SDK 已同步触发 onVerified（cookie 有效）则此处会重复赋值，无害。
    if (!isReady.value) isReady.value = true;
  });

  /** 搜索计数 +1，返回是否需要弹出认证 */
  function checkSearchAuth(): boolean {
    if (typeof window === "undefined") return false;
    if (isVerified.value) return false;

    const count = parseInt(localStorage.getItem(SEARCH_COUNT_KEY) || "0", 10) + 1;
    localStorage.setItem(SEARCH_COUNT_KEY, String(count));

    if (count > FREE_SEARCHES) {
      // 弹出认证弹窗（不阻塞，用户可关闭后继续搜索）
      showAuthModal();
      return true;
    }
    return false;
  }

  /** 显示认证弹窗（手动触发，走 SDK 内部 showAuthModal） */
  function showAuthModal() {
    WxAuth.showAuthModal();
  }

  return {
    isVerified: computed(() => isVerified.value),
    isReady: computed(() => isReady.value),
    checkSearchAuth,
  };
}
