import { ImageResponse } from "next/og";

// Standard browser-tab favicon. Next.js auto-routes this to /icon and
// emits the matching <link rel="icon"> tag in <head>.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 22,
          fontWeight: 900,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "-0.05em",
          borderRadius: 6,
        }}
      >
        S
      </div>
    ),
    { ...size },
  );
}
