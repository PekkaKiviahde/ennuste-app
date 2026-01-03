import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Ennuste MVP",
  description: "Ennuste SaaS MVP"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fi">
      <body>
        <div className="app-shell">
          {children}
        </div>
      </body>
    </html>
  );
}
