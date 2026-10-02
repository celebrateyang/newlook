"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { analyticsPath, GA_MEASUREMENT_ID } from "@/lib/analytics";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const subscribe = () => () => {};
const isEnabled = () => process.env.NODE_ENV === "production" && ["newself.cc", "www.newself.cc"].includes(window.location.hostname) && /^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID);

export function GoogleAnalytics() {
  const pathname = usePathname();
  const enabled = useSyncExternalStore(subscribe, isEnabled, () => false);
  const previous = useRef<string | null>(null);

  useEffect(() => {
    // Exclude local development and Vercel preview traffic.
    if (!enabled || !pathname || previous.current === pathname) return;
    window.dataLayer ??= [];
    if (!window.gtag) {
      // gtag's documented queue format is the function's Arguments object.
      // eslint-disable-next-line prefer-rest-params
      window.gtag = function () { window.dataLayer!.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", GA_MEASUREMENT_ID, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_location: `${window.location.origin}${analyticsPath(window.location.pathname)}`,
        page_title: "newself",
        page_referrer: "",
      });
    }
    const page = analyticsPath(pathname);
    const location = `${window.location.origin}${page}`;
    const referrer = previous.current ? `${window.location.origin}${analyticsPath(previous.current)}` : "";
    window.gtag?.("set", { page_location: location, page_title: `newself ${page}`, page_referrer: referrer });
    window.gtag?.("event", "page_view", { send_to: GA_MEASUREMENT_ID, page_location: location, page_title: `newself ${page}`, page_referrer: referrer });
    previous.current = pathname;
  }, [enabled, pathname]);

  return enabled ? <Script id="newself-google-analytics" src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" /> : null;
}
