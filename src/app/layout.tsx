import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { getSiteSettings } from "@/lib/site-settings";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    title: s.metaTitle,
    description: s.metaDescription,
    icons: s.faviconUrl ? { icon: s.faviconUrl } : undefined,
  };
}

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
