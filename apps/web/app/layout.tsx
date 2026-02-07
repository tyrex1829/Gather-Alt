import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: "Gather - Your team's virtual office",
  description: "Proximity-first collaboration for teams that want presence, spontaneity, and culture."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`min-h-screen w-full bg-[#0a0a0a] antialiased ${inter.variable} font-sans`}>
        <div className="min-h-screen w-full relative">
          <div
            className="pointer-events-none fixed inset-0 z-0"
            style={{
              background: `
                radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139, 92, 246, 0.04), transparent 60%),
                #0a0a0a
              `
            }}
          />
          <div className="relative z-10">{children}</div>
        </div>
      </body>
    </html>
  );
}
