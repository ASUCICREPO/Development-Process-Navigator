import "./globals.css";
import React from "react";

export const metadata = {
  title: "ProcessCanvas",
  description: "Instructor-authored activity sorting exercise",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <a href="/">ProcessCanvas</a>
          <a href="/instructor/">Instructor</a>
          <a href="/student/">Student</a>
        </nav>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
