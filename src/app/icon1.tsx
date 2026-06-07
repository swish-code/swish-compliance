import { ImageResponse } from "next/og";

// 512×512 — required by Android Chrome for the "Add to Home Screen"
// install banner and the splash screen.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon512() {
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
          fontSize: 320,
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
