"use client";
import React, { useEffect, useState } from "react";
import { getRole, clearSession, getViewAs, setViewAs } from "./session";

export const NavBar: React.FC = () => {
  const [role, setRole] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  useEffect(() => {
    const actualRole = getRole();
    setRole(actualRole);
    // Determine which view we're in based on URL
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.startsWith("/student")) {
        setViewing("STUDENT");
      } else if (path.startsWith("/instructor")) {
        setViewing("INSTRUCTOR");
      } else {
        setViewing(actualRole);
      }
    }
  }, []);

  function logout() {
    clearSession();
    window.location.href = "/";
  }

  function switchView(newView: string) {
    setViewAs(newView as "INSTRUCTOR" | "STUDENT");
    if (newView === "INSTRUCTOR") {
      window.location.href = "/instructor/";
    } else {
      window.location.href = "/student/";
    }
  }

  const initials = role ? (role === "INSTRUCTOR" ? "I" : "S") : "";

  return (
    <header className="top-header">
      <div className="top-header-left">
        <div className="top-header-logo">
          <img src="/images/asu-logo.png" alt="ASU W.P. Carey School of Business" style={{ height: 36 }} />
        </div>
        <span className="top-header-title">Development Process Navigator</span>
      </div>

      {role && (
        <div className="top-header-right">
          <span className="view-as-label">VIEW AS</span>
          <div className="role-toggle">
            <button
              className={viewing === "STUDENT" ? "active-student" : "inactive"}
              onClick={() => switchView("STUDENT")}
            >
              Student
            </button>
            <button
              className={viewing === "INSTRUCTOR" ? "active-instructor" : "inactive"}
              onClick={() => switchView("INSTRUCTOR")}
            >
              Instructor
            </button>
          </div>
          <div className="avatar" onClick={logout} title="Click to log out" style={{ cursor: "pointer" }}>
            {initials}
          </div>
        </div>
      )}
    </header>
  );
};
