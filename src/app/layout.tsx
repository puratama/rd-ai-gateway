import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "xPerimne AI Gateway - Unified Access to 500+ AI Models",
  description:
    "Access hundreds of AI models through one unified interface. Pay-as-you-go, no API keys needed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="h-full bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
