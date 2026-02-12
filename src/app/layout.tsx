import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { MockIndicator } from "@/components/debug/mock-indicator";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ModelBlitz",
  description:
    "Find the best vision model for your structured data extraction. Upload sample images, pay once, get a detailed benchmark report with field-level accuracy diffs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} bg-void text-text-primary antialiased`}
      >
        <NuqsAdapter>{children}</NuqsAdapter>
        <MockIndicator />
      </body>
    </html>
  );
}
