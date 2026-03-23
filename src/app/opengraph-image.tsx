import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AnimeHubs - Premium Anime Figures in Uppsala";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "white",
            marginBottom: 16,
            letterSpacing: "-2px",
          }}
        >
          AnimeHubs
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#a3a3a3",
            marginBottom: 32,
          }}
        >
          Premium Anime Figures in Uppsala, Sweden
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 18,
            color: "#737373",
          }}
        >
          <span>Nendoroid</span>
          <span>Scale Figures</span>
          <span>Figma</span>
          <span>Prize Figures</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
