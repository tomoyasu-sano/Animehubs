/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";

// next-intl モック
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      title: "Unsubscribe",
      loading: "Processing...",
      successTitle: "Unsubscribed",
      successMessage: "You have been successfully unsubscribed from our newsletter.",
      expiredTitle: "Link Expired",
      expiredMessage: "This unsubscribe link has expired.",
      invalidTitle: "Invalid Link",
      invalidMessage: "This unsubscribe link is invalid.",
      backToHome: "Back to Home",
    };
    return messages[key] ?? key;
  },
}));

// @/i18n/navigation モック
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) =>
    React.createElement("a", { href, ...props }, children),
}));

// next/navigation モック — テストごとにトークンを変えるため関数型
let currentToken: string | null = null;
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === "token" ? currentToken : null),
  }),
}));

// lucide-react モック
vi.mock("lucide-react", () => ({
  CheckCircle: ({ className }: { className?: string }) => React.createElement("div", { className, "data-testid": "check-icon" }),
  XCircle: ({ className }: { className?: string }) => React.createElement("div", { className, "data-testid": "x-icon" }),
  Clock: ({ className }: { className?: string }) => React.createElement("div", { className, "data-testid": "clock-icon" }),
  ArrowLeft: ({ className }: { className?: string }) => React.createElement("div", { className, "data-testid": "arrow-icon" }),
}));

// fetch モック
const mockFetch = vi.fn();
global.fetch = mockFetch;

import UnsubscribePage from "./page";

describe("UnsubscribePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentToken = null;
  });

  it("トークンがない場合は invalid を表示", () => {
    render(<UnsubscribePage />);

    expect(screen.getByText("Invalid Link")).toBeInTheDocument();
    expect(screen.getByText("This unsubscribe link is invalid.")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("有効なトークンで配信停止成功を表示", async () => {
    currentToken = "valid-token";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<UnsubscribePage />);

    expect(screen.getByText("Processing...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Unsubscribed")).toBeInTheDocument();
    });
    expect(screen.getByText("You have been successfully unsubscribed from our newsletter.")).toBeInTheDocument();
  });

  it("期限切れトークンの場合は expired メッセージを表示", async () => {
    currentToken = "expired-token";
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid token", reason: "expired" }),
    });

    render(<UnsubscribePage />);

    await waitFor(() => {
      expect(screen.getByText("Link Expired")).toBeInTheDocument();
    });
  });

  it("無効なトークンの場合は invalid メッセージを表示", async () => {
    currentToken = "bad-token";
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid token", reason: "invalid" }),
    });

    render(<UnsubscribePage />);

    await waitFor(() => {
      expect(screen.getByText("Invalid Link")).toBeInTheDocument();
    });
  });

  it("API呼び出しに正しいトークンを渡す", async () => {
    currentToken = "my-token-123";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<UnsubscribePage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/newsletter/unsubscribe?token=my-token-123",
      );
    });
  });

  it("ホームへのリンクを表示する", () => {
    render(<UnsubscribePage />);

    expect(screen.getByText("Back to Home")).toBeInTheDocument();
  });
});
