import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Swish Compliance App",
  description: "SOP register, audits, CAPA tracking and compliance dashboards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
