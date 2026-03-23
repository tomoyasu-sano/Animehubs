import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AnimeHubs - Premium Anime Figures in Uppsala",
    template: "%s | AnimeHubs",
  },
  description:
    "Hand-picked anime collectibles from Japan, available for local pickup in Uppsala, Sweden.",
  keywords: [
    "anime figures",
    "nendoroid",
    "scale figures",
    "figma",
    "Uppsala",
    "Sweden",
    "anime collectibles",
    "Japanese figures",
  ],
  authors: [{ name: "AnimeHubs" }],
  creator: "AnimeHubs",
  openGraph: {
    type: "website",
    siteName: "AnimeHubs",
    locale: "en_US",
    alternateLocale: "sv_SE",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
