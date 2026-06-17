"use client";
import React, { useEffect, useState } from "react";
import { getRole, clearSession } from "./session";

export const NavBar: React.FC = () => {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(getRole());
  }, []);

  function logout() {
    clearSession();
    window.location.href = "/";
  }

  return (
    <nav>
      <a href="/">ProcessCanvas</a>
      {role === "INSTRUCTOR" && <a href="/instructor/">Instructor</a>}
      {role === "STUDENT" && <a href="/student/">Student</a>}
      {role && (
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, opacity: 0.85 }}>{role.charAt(0) + role.slice(1).toLowerCase()}</span>
          <button
            onClick={logout}
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.4)", padding: "3px 10px", fontSize: 12, borderRadius: 4, cursor: "pointer", color: "#fff" }}
          >
            Log out
          </button>
        </span>
      )}
    </nav>
  );
};
