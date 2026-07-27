import {
  buildSeoAttribution,
  sanitizeSeoAttribution,
  type SeoAttribution,
} from "~/utils/seoAttribution";

const STORAGE_KEY = "haosouku:seo-attribution";
const LANDING_EVENT_KEY = "haosouku:seo-landing-event";

function createEventId(prefix: string): string {
  const value = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${value}`;
}

export function useSeoAttribution() {
  const attribution = useState<SeoAttribution | null>(
    "seo-attribution",
    () => null
  );
  const runtimeConfig = useRuntimeConfig();
  const apiBase = String(runtimeConfig.public?.apiBase || "/api");

  function initialize(): SeoAttribution | null {
    if (!import.meta.client) return attribution.value;
    if (attribution.value) return attribution.value;

    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        attribution.value = sanitizeSeoAttribution(JSON.parse(stored));
        return attribution.value;
      }
    } catch {}

    const params = new URLSearchParams(window.location.search);
    attribution.value = buildSeoAttribution({
      landingPath: window.location.pathname,
      referrer: document.referrer,
      siteHost: window.location.hostname,
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
    });
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution.value));
    } catch {}
    return attribution.value;
  }

  function getAttribution(): SeoAttribution | null {
    return attribution.value || initialize();
  }

  function trackLanding(): void {
    if (!import.meta.client) return;
    const current = getAttribution();
    if (!current) return;

    let eventId = "";
    try {
      eventId = sessionStorage.getItem(LANDING_EVENT_KEY) || "";
      if (!eventId) {
        eventId = createEventId("landing");
        sessionStorage.setItem(LANDING_EVENT_KEY, eventId);
      } else {
        return;
      }
    } catch {
      eventId = createEventId("landing");
    }

    void fetch(`${apiBase}/seo/event`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify({
        event: "landing",
        eventId,
        attribution: current,
      }),
    }).catch(() => undefined);
  }

  return {
    attribution: readonly(attribution),
    initialize,
    getAttribution,
    trackLanding,
  };
}
