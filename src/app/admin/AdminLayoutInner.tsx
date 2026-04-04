"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  BarChart3,
  Mail,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/sales", label: "Sales", icon: BarChart3 },
];

export default function AdminLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    if (isLoginPage || status === "loading") return;

    if (status === "unauthenticated" || !isAdmin) {
      router.push("/admin/login");
    }
  }, [isLoginPage, status, isAdmin, router]);

  // ログインページ: サイドバーなしで表示
  if (isLoginPage) {
    return (
      <html lang="en">
        <body className="min-h-screen bg-gray-50 font-sans antialiased">
          {children}
        </body>
      </html>
    );
  }

  if (status === "loading") {
    return (
      <html lang="en">
        <body className="min-h-screen bg-gray-50 font-sans antialiased">
          <div className="flex h-screen items-center justify-center">
            <div className="text-gray-500">Loading...</div>
          </div>
        </body>
      </html>
    );
  }

  if (!isAdmin) {
    return (
      <html lang="en">
        <body className="min-h-screen bg-gray-50 font-sans antialiased">
          <div className="flex h-screen items-center justify-center">
            <div className="text-gray-500">Redirecting...</div>
          </div>
        </body>
      </html>
    );
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/admin/login" });
  };

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <div className="flex h-screen">
          {/* モバイルオーバーレイ */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* サイドバー */}
          <aside
            className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-gray-900 text-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex h-16 items-center justify-between border-b border-gray-700 px-6">
              <Link href="/admin" className="text-lg font-bold">
                AnimeHubs Admin
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="mt-6 space-y-1 px-3">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="absolute bottom-0 w-full border-t border-gray-700 p-4">
              <div className="mb-2 px-3 text-xs text-gray-500 truncate">
                {session?.user?.email}
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </aside>

          {/* メインコンテンツ */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* トップバー */}
            <header className="flex h-16 items-center border-b border-gray-200 bg-white px-6">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-6 w-6 text-gray-600" />
              </button>
              <div className="ml-4 text-sm text-gray-500 lg:ml-0">
                {navItems.find(
                  (item) =>
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href)
                )?.label || "Admin"}
              </div>
            </header>

            {/* ページコンテンツ */}
            <main className="flex-1 overflow-auto p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
