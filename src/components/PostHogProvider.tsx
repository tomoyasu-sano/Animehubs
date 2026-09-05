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

const PRODUCTION_HOSTNAME = "anime-hubs.com";
const OPT_OUT_KEY = "ph_opt_out";

function hasConsent(): boolean {
  try {
    return localStorage.getItem(COOKIE_CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

// ?no_track=1 を一度開いたブラウザは以後計測しない（?no_track=0 で解除）
function isOptedOut(): boolean {
  try {
    const flag = new URLSearchParams(window.location.search).get("no_track");
    if (flag === "1") localStorage.setItem(OPT_OUT_KEY, "1");
    if (flag === "0") localStorage.removeItem(OPT_OUT_KEY);
    return localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

// 本番ドメイン以外（localhost・プレビュー）と opt-out 済みブラウザは自己アクセスのため計測しない
// www あり/なし両方で 200 を返すため両ホスト名を本番として扱う
function isTrackingAllowed(): boolean {
  const { hostname } = window.location;
  const isProduction =
    hostname === PRODUCTION_HOSTNAME || hostname === `www.${PRODUCTION_HOSTNAME}`;
  return isProduction && !isOptedOut();
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

    if (!isTrackingAllowed()) {
      // 過去に localhost 等で opt-in した状態が PostHog 側に永続していても打ち消す
      posthog.opt_out_capturing();
    } else if (hasConsent()) {
      posthog.opt_in_capturing();
    }

    // CookieBanner で「同意」した瞬間に計測を開始し、初回ページビューを送る
    const onConsent = () => {
      if (!isTrackingAllowed()) return;
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
