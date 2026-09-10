import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import { CompassMark } from "@/components/Logo";
import { ThemeToggle, themeInitScript } from "@/components/ThemeToggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Pusula · AI Destekli İş Analizi Asistanı",
  description:
    "Ham gereksinimleri User Story, Gherkin kabul kriterleri ve test senaryolarına dönüştürür.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="tr"
      // themeInitScript, hydrate'den önce <html>'e data-theme ekler; bu tek
      // attribute farkı için uyarıyı bastır (yalnızca <html> düzeyinde).
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-ink">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-5">
            <div className="flex items-center gap-2">
              <CompassMark className="h-7 w-7 text-accent" />
              <span className="font-serif text-[17px] font-semibold tracking-tight">
                Pusula
              </span>
            </div>
            <SiteNav />
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-md border border-line px-2.5 py-1 font-mono text-[11px] text-muted sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                gemini-3.6-flash
              </span>
              <ThemeToggle />
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
