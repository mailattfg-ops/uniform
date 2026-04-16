import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/hooks/useTheme";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { LayoutProvider } from "@/hooks/useLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Next.js Global Theme System",
  description: "Scalable theme system with color switching",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen">
        {/* <ThemeProvider> */}
          <LayoutProvider>
            <div className="flex h-screen bg-background text-foreground overflow-hidden relative w-full">
              <Sidebar />
              <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative w-full">
                <Header />
                <div className="flex-1 bg-white dark:bg-zinc-950 rounded-tl-[2rem] lg:rounded-tl-[4.5rem] p-4 lg:p-12 overflow-y-auto no-scrollbar shadow-[inset_0_20px_40px_rgba(0,0,0,0.1)] transition-all duration-500 w-full max-w-full">
                  <div className="w-full max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
                    {children}
                  </div>
                </div>
              </main>
            </div>
          </LayoutProvider>
        {/* </ThemeProvider> */}
      </body>
    </html>
  );
}
