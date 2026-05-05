import type { Metadata, Viewport } from "next";
import { I18nProvider } from "@/i18n";
import {
  sourceSerif4,
  playfairDisplay,
  jetbrainsMono,
  notoSerifSC,
} from "./fonts";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#faf8f4",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Destiny — Drift Through Teyvat",
  description:
    "Answer a brief editorial questionnaire, reveal who you are in Teyvat, and walk through a branching adventure written for you.",
  openGraph: {
    title: "Destiny — Drift Through Teyvat",
    description:
      "Answer a brief editorial questionnaire, reveal who you are in Teyvat, and walk through a branching adventure written for you.",
    siteName: "Destiny",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Destiny — Drift Through Teyvat",
    description:
      "Answer a brief editorial questionnaire, reveal who you are in Teyvat, and walk through a branching adventure written for you.",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${sourceSerif4.variable} ${playfairDisplay.variable} ${jetbrainsMono.variable} ${notoSerifSC.variable}`}
    >
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
