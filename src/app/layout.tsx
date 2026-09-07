import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sparkles } from "lucide-react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReqToStory · AI Destekli İş Analizi Asistanı",
  description:
    "Ham gereksinimleri User Story, Gherkin kabul kriterleri ve test senaryolarına dönüştürür.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-ink">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-[var(--accent-fg)]">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold tracking-tight">ReqToStory</span>
              <span className="hidden font-mono text-[11px] text-faint sm:inline">
                requirements → user stories
              </span>
            </div>
            <span className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 font-mono text-[11px] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              gemini-2.0-flash
            </span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
