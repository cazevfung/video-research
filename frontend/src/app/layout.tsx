import type { Metadata } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "@/components/providers";
import { DevModePanel } from "@/components/DevModePanel";
import { AppLayoutWrapper } from "@/components/AppLayoutWrapper";
import { RTLWrapper } from "@/components/RTLWrapper";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-cursor-gothic-beta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "YouTube Batch Summary Service",
  description: "Turn hours of video into minutes of reading",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const savedTheme = localStorage.getItem('theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const theme = savedTheme || (prefersDark ? 'dark' : 'dark');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <Providers>
          <RTLWrapper>
            <AppLayoutWrapper>
              {children}
            </AppLayoutWrapper>
            <DevModePanel />
          </RTLWrapper>
        </Providers>
      </body>
    </html>
  );
}
