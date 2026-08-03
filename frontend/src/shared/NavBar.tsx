"use client";
import React, { useEffect, useState } from "react";
import { getRole, clearSession } from "./session";

export const NavBar: React.FC = () => {
  const [role, setRole] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const actualRole = getRole();
    setRole(actualRole);
  }, []);

  function logout() {
    clearSession();
    window.location.href = "/";
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
          <a
            href="/tutorial"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 6,
              padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "#374151",
              textDecoration: "none", cursor: "pointer",
            }}
            title="Help Center"
          >
            <span style={{ fontSize: 15 }}>?</span> Tutorial
          </a>
          <div style={{ position: "relative" }}>
            <div
              className="avatar"
              onClick={() => setShowMenu(!showMenu)}
              style={{ cursor: "pointer" }}
            >
              {initials}
            </div>
            {showMenu && (
              <div style={{
                position: "absolute", top: 44, right: 0, background: "#fff",
                border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                zIndex: 200, minWidth: 160, overflow: "hidden",
              }}>
                <button
                  onClick={() => { setShowMenu(false); window.location.href = role === "INSTRUCTOR" ? "/instructor/" : "/student/"; }}
                  style={{
                    display: "block", width: "100%", background: "none", border: "none",
                    padding: "10px 16px", fontSize: 13, color: "#374151", fontWeight: 500,
                    cursor: "pointer", textAlign: "left", borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  My Dashboard
                </button>
                <button
                  onClick={logout}
                  style={{
                    display: "block", width: "100%", background: "none", border: "none",
                    padding: "10px 16px", fontSize: 13, color: "#ef4444", fontWeight: 600,
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
