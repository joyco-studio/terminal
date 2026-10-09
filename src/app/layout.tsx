import type { Metadata } from "next";
import { Public_Sans, Roboto_Mono } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-public-sans",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-roboto-mono",
});

/** Vercel sets the production host; locally fall back to the dev server. */
const SITE_ORIGIN = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: "JOYCO terminal",
  description:
    "A terminal view of joyco.studio: the studio, its work and how to reach it, rendered as text.",
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${robotoMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
