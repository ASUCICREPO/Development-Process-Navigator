import "./globals.css";
import React from "react";
import { NavBar } from "../src/shared/NavBar";

export const metadata = {
  title: "ProcessCanvas",
  description: "Instructor-authored activity sorting exercise",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
