import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "UCFGuessr",
  description: "GeoGuessr for UCF!",
  icons: {
    icon: "https://i.pinimg.com/originals/56/fc/a0/56fca09d8eb0a9b020d8c42212008e7c.png",
  },
  openGraph: {
    images: "https://ntk8n4sii7.ufs.sh/f/cLWmiQyDE9Nl6zz9neBZSiEhKYJapTOzHQZWcv83BUrX2Ll9",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
