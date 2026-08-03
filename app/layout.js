import { Big_Shoulders_Display, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./global.css";

const display = Big_Shoulders_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
});

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata = {
  title: "Ronak Jewellers | Gold & Silver Bullion, Refined In-House",
  description:
    "Ronak Jewellers trades gold and silver bullion at live MCX-linked rates. Every bar we sell is refined and cut in-house by Ronak Refine Cutters and Melters, marked Electro Refined Silver.",
  manifest: "/manifest.json",
  themeColor: "#0B0C0E",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RJ Bullion",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
