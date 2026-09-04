import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WCAG Contrast Checker",
  description:
    "Check text and background colour pairs against WCAG 2.2 AA and AAA contrast requirements.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0f1115] text-[#e8eaed]">
        {children}
      </body>
    </html>
  );
}
