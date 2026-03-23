import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AnimeHubs - Premium Anime Figures in Uppsala",
  description: "Hand-picked anime collectibles from Japan, available for local pickup in Uppsala, Sweden.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
