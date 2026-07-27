import type { SeoAttribution } from "../utils/seoAttribution";

export interface TrafficClientContext {
  visitorId: string;
  sessionId: string;
  path: string;
  attribution: SeoAttribution;
  language: string;
  screen: string;
}

export interface TrafficWebVitals {
  lcp?: number;
  cls?: number;
  inp?: number;
  fcp?: number;
  ttfb?: number;
}

export type TrafficEventBody =
  | {
      event: "page_view";
      eventId: string;
      context: TrafficClientContext;
    }
  | {
      event: "page_leave";
      eventId: string;
      context: TrafficClientContext;
      durationMs: number;
      errorCount?: number;
      vitals?: TrafficWebVitals;
    }
  | {
      event: "client_error";
      eventId: string;
      context: TrafficClientContext;
      message: string;
    };
