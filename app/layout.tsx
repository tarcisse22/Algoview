import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeToggle } from "./components/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Algoview — Master algorithms by tracing them",
  description: "Write code, trace variables and state changes, and practice patterns with intent.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <span className="text-xl font-bold tracking-tight">Algoview</span>
            <div className="flex items-center gap-4">
              <ThemeToggle />
            </div>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
