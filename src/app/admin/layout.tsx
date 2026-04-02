"use client";

import { SessionProvider } from "next-auth/react";
import AdminLayoutInner from "./AdminLayoutInner";
import "@/app/globals.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </SessionProvider>
  );
}
