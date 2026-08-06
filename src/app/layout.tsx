import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "xPerimne AI Gateway - Premium AI Models. One API.",
  description:
    "OpenAI-compatible gateway for developers. Access premium AI models, manage API keys, and track usage from one dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      {/* Inline critical style: apply dark bg + color-scheme before the CSS chunk loads, prevents white flash (FOUC) on every navigation. */}
      <head>
        <style>{`html{background-color:#01142b;color-scheme:dark}`}</style>
      </head>
      <body className="h-full bg-background text-foreground font-sans">
        {children}
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
