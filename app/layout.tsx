import type { Metadata } from "next";
import { Inter, Bebas_Neue, Barlow_Condensed, Barlow } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"] });
const barlowCondensed = Barlow_Condensed({ weight: ["300", "400", "600", "700"], subsets: ["latin"] });
const barlow = Barlow({ weight: ["300", "400", "500"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SMFC Manager - Real-time Squad Management",
  description: "Manage your football squad in real-time with tactical insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
