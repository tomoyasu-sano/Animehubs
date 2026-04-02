// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// fetch モック
const mockFetch = vi.fn();
global.fetch = mockFetch;

// next-auth/react モック
const mockUseSession = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

// next/navigation モック
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/en/products",
}));

// next-intl モック
vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));

import { useFavorites } from "./useFavorites";

describe("useFavorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("認証済みユーザー", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1" } },
        status: "authenticated",
      });
    });

    it("初期ロード時にAPIからお気に入り一覧を取得する", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { productId: "p1" },
          { productId: "p2" },
        ]),
      });

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.isFavorite("p1")).toBe(true);
      expect(result.current.isFavorite("p2")).toBe(true);
      expect(result.current.isFavorite("p3")).toBe(false);
    });

    it("toggleFavoriteでお気に入り追加APIを呼ぶ（楽観的更新）", async () => {
      // 初期ロード
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // 追加API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await act(async () => {
        result.current.toggleFavorite("p1");
      });

      // 楽観的更新で即座にtrueになる
      expect(result.current.isFavorite("p1")).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith("/api/favorites", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ productId: "p1" }),
      }));
    });

    it("toggleFavoriteでお気に入り削除APIを呼ぶ（楽観的更新）", async () => {
      // 初期ロード
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ productId: "p1" }]),
      });

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.isFavorite("p1")).toBe(true);
      });

      // 削除API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await act(async () => {
        result.current.toggleFavorite("p1");
      });

      // 楽観的更新で即座にfalseになる
      expect(result.current.isFavorite("p1")).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith("/api/favorites/p1", expect.objectContaining({
        method: "DELETE",
      }));
    });
  });

  describe("未認証ユーザー", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
      });
    });

    it("toggleFavoriteでログインページにリダイレクトする", async () => {
      const { result } = renderHook(() => useFavorites());

      await act(async () => {
        result.current.toggleFavorite("p1");
      });

      expect(mockPush).toHaveBeenCalledWith(
        "/en/auth/login?callbackUrl=%2Fen%2Fproducts",
      );
      expect(mockFetch).not.toHaveBeenCalledWith("/api/favorites", expect.anything());
    });

    it("お気に入り一覧は空を返す", () => {
      const { result } = renderHook(() => useFavorites());

      expect(result.current.favorites).toEqual([]);
      expect(result.current.isFavorite("p1")).toBe(false);
    });
  });
});
