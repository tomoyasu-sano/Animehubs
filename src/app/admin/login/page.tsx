"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { LogIn } from "lucide-react";

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginContent />
    </Suspense>
  );
}

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const notAdmin = searchParams.get("error") === "not_admin";

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await signIn("google", { callbackUrl: "/admin" });
    } catch {
      setError("ログインに失敗しました。もう一度お試しください。");
      setLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    setLoading(true);
    setError("");
    try {
      await signOut({ redirect: false });
      await signIn("google", { callbackUrl: "/admin" });
    } catch {
      setError("ログインに失敗しました。もう一度お試しください。");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">AnimeHubs Admin</h1>
          <p className="mt-2 text-sm text-gray-500">
            管理者の Google アカウントでログインしてください
          </p>
        </div>

        {notAdmin && (
          <div className="space-y-3">
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              {session?.user?.email ? (
                <>
                  <strong>{session.user.email}</strong> には管理者権限がありません。
                </>
              ) : (
                <>このアカウントには管理者権限がありません。</>
              )}
              管理者用の Google アカウントでログインしてください。
            </div>
            <button
              onClick={handleSwitchAccount}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              {loading ? "リダイレクト中..." : "別の Google アカウントでログイン"}
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          <LogIn className="h-4 w-4" />
          {loading ? "リダイレクト中..." : "Google でログイン"}
        </button>

        <p className="text-center text-xs text-gray-400">
          管理者として登録されたアカウントのみアクセスできます。
        </p>
      </div>
    </div>
  );
}
