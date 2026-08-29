"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";

// Project API Key は公開前提（ブラウザに埋め込まれる）ため、seo.ts と同様に定数フォールバックを持つ。
const POSTHOG_KEY =
  process.env.NEXT_PUBLIC_POSTHOG_KEY ||
  "phc_yFNtRt9U9F9QRQWdPaXKi9NDmKniVqjTzL4WSb6RcxfH";
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

// CookieBanner の同意キーと合わせる（同意後のみ計測＝GDPR配慮）
const COOKIE_CONSENT_KEY = "animehubs-cookie-consent";
const CONSENT_EVENT = "cookie-consent-accepted";

function hasConsent(): boolean {
  try {
    return localStorage.getItem(COOKIE_CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

interface PostHogProviderProps {
  children: React.ReactNode;
}

export default function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    if (!posthog.__loaded) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: "identified_only",
        capture_pageview: false, // App Router では手動で $pageview を送る
        capture_pageleave: true,
        // 同意前は送信しない。opt_out 中は capture() が no-op になる。
        opt_out_capturing_by_default: true,
      });
    }

    if (hasConsent()) {
      posthog.opt_in_capturing();
    }

    // CookieBanner で「同意」した瞬間に計測を開始し、初回ページビューを送る
    const onConsent = () => {
      posthog.opt_in_capturing();
      posthog.capture("$pageview");
    };
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}

// ルート遷移ごとに $pageview を送る（opt_out 中は no-op なので同意前は送られない）
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (!pathname || !ph) return;
    let url = window.origin + pathname;
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
    ph.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, ph]);

  return null;
}
