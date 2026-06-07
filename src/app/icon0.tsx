import { ImageResponse } from "next/og";

// 192×192 — the smallest size Chrome requires for the PWA install prompt
// (Android home-screen icon). Solid background + no transparency so it
// looks fine as a "maskable" icon too.
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon192() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2f7a4a 0%, #0f2e1c 100%)",
          color: "white",
          fontSize: 120,
          fontWeight: 900,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "-0.06em",
        }}
      >
        S
      </div>
    ),
    { ...size },
  );
}
