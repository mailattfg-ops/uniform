import type { Metadata } from "next";
import "./globals.css";
import { LayoutProvider } from "@/hooks/useLayout";
import { AnimatedToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Forma Apparels",
  description: "Forma Apparels Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Geist+Mono:wght@100..900&family=Libre+Barcode+39&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="min-h-screen">
        <AnimatedToastProvider position="bottom-right">
          <LayoutProvider>
            {children}
          </LayoutProvider>
        </AnimatedToastProvider>
      </body>
    </html>
  );
}
