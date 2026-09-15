import { createApp } from "vue";
import App from "./App.vue";
import "./styles/global.css";
import "./styles/dark-mode.css";
import { initAuth } from "./api/auth";
import { API_BASE } from "./config";

// 启动应用（微信认证已移除）
initAuth();

createApp(App).mount("#app");

console.info(`[PanHub] 静态版已启动，接口地址：${API_BASE}`);
