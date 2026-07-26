import type { Metadata } from "next";
import { Berkshire_Swash, Bree_Serif, Sora } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const displayFont = Berkshire_Swash({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const cardFont = Bree_Serif({
  variable: "--font-card",
  subsets: ["latin"],
  weight: "400",
});

const monthFont = localFont({
  src: "./fonts/morally-serif.woff2",
  variable: "--font-month",
  display: "swap",
});

const bodyFont = Sora({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Custom Google Calendar",
  description: "Branded Google Calendar embed for Pandora's Deck Box.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${cardFont.variable} ${monthFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
