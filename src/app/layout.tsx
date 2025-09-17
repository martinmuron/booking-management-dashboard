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
  title: {
    default: "Nick & Jenny | Premium Vacation Rentals in Prague",
    template: "%s | Nick & Jenny"
  },
  description: "Experience Prague like a local with Nick & Jenny's thoughtfully renovated apartments. Modern amenities, prime locations, and exceptional hospitality for your perfect stay.",
  keywords: ["Prague vacation rentals", "Prague apartments", "Prague accommodation", "short term rentals Prague", "Airbnb Prague", "Prague city center", "Prague housing"],
  authors: [{ name: "Nick & Jenny" }],
  creator: "Nick & Jenny",
  publisher: "Nick & Jenny",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://www.nickandjenny.cz"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.nickandjenny.cz",
    title: "Nick & Jenny | Premium Vacation Rentals in Prague",
    description: "Experience Prague like a local with Nick & Jenny's thoughtfully renovated apartments. Modern amenities, prime locations, and exceptional hospitality for your perfect stay.",
    siteName: "Nick & Jenny",
    images: [
      {
        url: "/og-image.jpg", // We'll need to add this image
        width: 1200,
        height: 630,
        alt: "Nick & Jenny - Premium Prague Vacation Rentals",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nick & Jenny | Premium Vacation Rentals in Prague",
    description: "Experience Prague like a local with Nick & Jenny's thoughtfully renovated apartments. Modern amenities, prime locations, and exceptional hospitality.",
    images: ["/og-image.jpg"],
    creator: "@nickandjenny", // Update if you have Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code", // Add when available
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
        <div className="min-h-dvh w-full">
          {children}
        </div>
      </body>
    </html>
  );
}
