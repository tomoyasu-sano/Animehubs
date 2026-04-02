"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await signIn("google", { callbackUrl: "/admin" });
    } catch {
      setError("Login failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">AnimeHubs Admin</h1>
          <p className="mt-2 text-sm text-gray-500">
            Sign in with your admin Google account
          </p>
        </div>

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
          {loading ? "Redirecting..." : "Sign in with Google"}
        </button>

        <p className="text-center text-xs text-gray-400">
          Only authorized admin accounts can access this panel.
        </p>
      </div>
    </div>
  );
}
