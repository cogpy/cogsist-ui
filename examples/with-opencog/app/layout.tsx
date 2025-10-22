import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenCog + Assistant-UI Demo",
  description: "Democratized OpenCog interface with bidirectional Atomese translation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}