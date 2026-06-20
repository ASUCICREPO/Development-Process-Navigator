import "./globals.css";
import React from "react";
import { NavBar } from "../src/shared/NavBar";

export const metadata = {
  title: "Development Process Navigator",
  description: "Real estate development process ordering exercise",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
