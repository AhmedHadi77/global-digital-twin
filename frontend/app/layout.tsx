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

const siteUrl = "https://global-digital-twin-frontend.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Zenith Digital Twin | IoT Monitoring Dashboard",
    template: "%s | Zenith Digital Twin",
  },
  description:
    "Zenith Digital Twin is a real-time IoT and industrial monitoring platform for simulated connected devices, anomaly detection, alert tracking, and 3D operational visibility.",
  applicationName: "Zenith Digital Twin",
  keywords: [
    "digital twin",
    "IoT dashboard",
    "industrial monitoring",
    "embedded systems",
    "distributed systems",
    "real-time monitoring",
    "device telemetry",
    "Next.js dashboard",
  ],
  authors: [{ name: "Ahmed Hadi" }],
  creator: "Ahmed Hadi",
  publisher: "Ahmed Hadi",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Zenith Digital Twin | IoT Monitoring Dashboard",
    description:
      "A real-time digital twin platform for IoT telemetry, anomaly detection, and device-level operations visibility.",
    siteName: "Zenith Digital Twin",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zenith Digital Twin | IoT Monitoring Dashboard",
    description:
      "A real-time digital twin platform for IoT telemetry, anomaly detection, and device-level operations visibility.",
  },
  robots: {
    index: true,
    follow: true,
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
