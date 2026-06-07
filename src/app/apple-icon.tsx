import { ImageResponse } from "next/og";

// 180×180 — what iOS Safari grabs for "Add to Home Screen". Slightly
// rounded inside via a generous corner radius so it looks native on iOS.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 118,
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
