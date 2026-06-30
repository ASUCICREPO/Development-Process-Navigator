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
        <footer className="app-footer">
          © Arizona State University · W.P. Carey School of Business | Powered by ASU Cloud Innovation Centre | <a href="https://www.asu.edu/accessibility" target="_blank" rel="noopener noreferrer">Accessibility</a>
        </footer>
      </body>
    </html>
  );
}
