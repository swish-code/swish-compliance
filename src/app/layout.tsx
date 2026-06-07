import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Swish Compliance",
    template: "%s — Swish Compliance",
  },
  description:
    "SOP register, audits, CAPA tracking and compliance dashboards for Swish.",
  applicationName: "Swish Compliance",
  appleWebApp: {
    capable: true,
    title: "Swish",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  // Next.js will also auto-inject the generated icon.tsx / apple-icon.tsx
  // routes. Keeping the SVG declaration here as a fallback for browsers
  // that prefer SVG favicons.
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

/**
 * Viewport — separate export in Next.js 15. `viewportFit: cover` so the app
 * extends under iPhone notches when installed as a PWA; safe-area insets
 * are handled in CSS. `themeColor` paints the mobile address bar to match
 * the dark sidebar.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#154027" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1813" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
