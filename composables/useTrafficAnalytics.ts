import type {
  TrafficClientContext,
  TrafficEventBody,
  TrafficWebVitals,
} from "~/types/analytics";

const VISITOR_KEY = "haosouku:traffic-visitor";
const SESSION_KEY = "haosouku:traffic-session";
const SESSION_TIMEOUT_MS = 30 * 60 * 1_000;

interface StoredSession {
  id: string;
  lastActivity: number;
}

function randomId(): string {
  if ("randomUUID" in crypto) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function eventId(prefix: string): string {
  return `${prefix}:${randomId()}`;
}

function screenBucket(): string {
  const width = window.innerWidth;
  if (width < 480) return "xs";
  if (width < 768) return "sm";
  if (width < 1024) return "md";
  if (width < 1440) return "lg";
  return "xl";
}

function readOrCreateVisitor(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const created = randomId();
    localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    return randomId();
  }
}

function readOrCreateSession(now: number): StoredSession {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const current = raw ? JSON.parse(raw) as StoredSession : null;
    if (
      current?.id &&
      now - Number(current.lastActivity || 0) < SESSION_TIMEOUT_MS
    ) {
      const refreshed = { ...current, lastActivity: now };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(refreshed));
      return refreshed;
    }
    const created = { id: randomId(), lastActivity: now };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(created));
    return created;
  } catch {
    return { id: randomId(), lastActivity: now };
  }
}

export function useTrafficAnalytics() {
  const runtimeConfig = useRuntimeConfig();
  const apiBase = String(runtimeConfig.public?.apiBase || "/api");
  const route = useRoute();
  const router = useRouter();
  const { getAttribution, initialize: initializeAttribution } =
    useSeoAttribution();
  const context = useState<TrafficClientContext | null>(
    "traffic-context",
    () => null
  );
  const started = useState<boolean>("traffic-started", () => false);

  let currentPath = "";
  let visibleStartedAt = 0;
  let visibleDurationMs = 0;
  let errorCount = 0;
  let vitalsSent = false;
  let observers: PerformanceObserver[] = [];
  let removeBeforeGuard: (() => void) | undefined;
  let removeAfterGuard: (() => void) | undefined;
  const vitals: TrafficWebVitals = {};

  function isTrackablePath(path: string): boolean {
    return !path.startsWith("/ops") && !path.startsWith("/api");
  }

  function touchSession(): void {
    try {
      if (!context.value) return;
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          id: context.value.sessionId,
          lastActivity: Date.now(),
        })
      );
    } catch {}
  }

  function initialize(): TrafficClientContext | null {
    if (!import.meta.client) return context.value;
    initializeAttribution();
    const now = Date.now();
    const session = readOrCreateSession(now);
    const attribution = getAttribution();
    if (!attribution) return null;
    context.value = {
      visitorId: readOrCreateVisitor(),
      sessionId: session.id,
      path: route.path || "/",
      attribution,
      language: navigator.language || "unknown",
      screen: screenBucket(),
    };
    return context.value;
  }

  function getContext(path = route.path || "/"): TrafficClientContext | null {
    const current = context.value || initialize();
    if (!current) return null;
    return {
      ...current,
      path,
      screen: import.meta.client ? screenBucket() : current.screen,
    };
  }

  function send(body: TrafficEventBody): void {
    if (!import.meta.client) return;
    touchSession();
    const url = `${apiBase}/traffic/event`;
    const payload = JSON.stringify(body);
    if (
      "sendBeacon" in navigator &&
      navigator.sendBeacon(
        url,
        new Blob([payload], { type: "application/json" })
      )
    ) {
      return;
    }
    void fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: payload,
    }).catch(() => undefined);
  }

  function currentVisibleDuration(): number {
    return Math.max(
      0,
      visibleDurationMs +
        (visibleStartedAt ? performance.now() - visibleStartedAt : 0)
    );
  }

  function resetVisibleDuration(): void {
    visibleDurationMs = 0;
    visibleStartedAt = document.hidden ? 0 : performance.now();
  }

  function trackPageView(path: string): void {
    if (!isTrackablePath(path)) return;
    const value = getContext(path);
    if (!value) return;
    currentPath = path;
    errorCount = 0;
    resetVisibleDuration();
    send({
      event: "page_view",
      eventId: eventId("view"),
      context: value,
    });
  }

  function flushPage(): void {
    if (!currentPath || !isTrackablePath(currentPath)) return;
    const value = getContext(currentPath);
    if (!value) return;
    send({
      event: "page_leave",
      eventId: eventId("leave"),
      context: value,
      durationMs: Math.round(currentVisibleDuration()),
      errorCount: 0,
      vitals: vitalsSent ? undefined : { ...vitals },
    });
    vitalsSent = true;
    currentPath = "";
    errorCount = 0;
    resetVisibleDuration();
  }

  function trackClientError(message: string): void {
    if (!currentPath || errorCount >= 10) return;
    const value = getContext(currentPath);
    if (!value) return;
    errorCount += 1;
    send({
      event: "client_error",
      eventId: eventId("error"),
      context: value,
      message,
    });
  }

  function observePerformance(): void {
    if (!("PerformanceObserver" in window)) return;
    const observe = (
      type: string,
      callback: (entries: PerformanceEntry[]) => void
    ) => {
      try {
        const observer = new PerformanceObserver((list) => {
          callback(list.getEntries());
        });
        observer.observe({ type, buffered: true } as PerformanceObserverInit);
        observers.push(observer);
      } catch {}
    };

    const navigation = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.responseStart) vitals.ttfb = navigation.responseStart;
    const paint = performance.getEntriesByName("first-contentful-paint")[0];
    if (paint?.startTime) vitals.fcp = paint.startTime;

    observe("largest-contentful-paint", (entries) => {
      const latest = entries.at(-1);
      if (latest) vitals.lcp = latest.startTime;
    });
    observe("layout-shift", (entries) => {
      const total = entries.reduce((sum, entry) => {
        const shift = entry as PerformanceEntry & {
          value?: number;
          hadRecentInput?: boolean;
        };
        return shift.hadRecentInput ? sum : sum + Number(shift.value || 0);
      }, Number(vitals.cls || 0));
      vitals.cls = Math.round(total * 10_000) / 10_000;
    });
    observe("event", (entries) => {
      const longest = entries.reduce(
        (maximum, entry) => Math.max(maximum, entry.duration || 0),
        Number(vitals.inp || 0)
      );
      if (longest > 0) vitals.inp = longest;
    });
  }

  function handleVisibilityChange(): void {
    if (document.hidden) {
      if (visibleStartedAt) {
        visibleDurationMs += performance.now() - visibleStartedAt;
        visibleStartedAt = 0;
      }
      return;
    }
    visibleStartedAt = performance.now();
  }

  function handleWindowError(event: ErrorEvent): void {
    trackClientError(event.message || "脚本执行失败");
  }

  function handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const reason = event.reason;
    trackClientError(
      reason instanceof Error
        ? reason.message
        : String(reason || "未处理的异步错误")
    );
  }

  function start(): void {
    if (!import.meta.client || started.value) return;
    started.value = true;
    initialize();
    observePerformance();
    trackPageView(route.path || "/");

    removeBeforeGuard = router.beforeEach(() => {
      flushPage();
      return true;
    });
    removeAfterGuard = router.afterEach((to) => {
      trackPageView(to.path || "/");
    });

    window.addEventListener("pagehide", flushPage);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
  }

  onBeforeUnmount(() => {
    observers.forEach((observer) => observer.disconnect());
    observers = [];
    removeBeforeGuard?.();
    removeAfterGuard?.();
    window.removeEventListener("pagehide", flushPage);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("error", handleWindowError);
    window.removeEventListener(
      "unhandledrejection",
      handleUnhandledRejection
    );
  });

  return {
    context: readonly(context),
    initialize,
    getContext,
    start,
  };
}
