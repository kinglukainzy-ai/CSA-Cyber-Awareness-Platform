import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "CSA Cyber Awareness Platform",
  description: "Cybersecurity awareness for every Ghanaian"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
