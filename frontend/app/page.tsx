"use client";
import React, { useState } from "react";
import { register, login, setSession, getRole, clearSession } from "../src/shared/session";

function decodeJwt(token: string): any {
  const part = token.split(".")[1];
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  return JSON.parse(decodeURIComponent(escape(atob(b64 + pad))));
}

type Mode = "login" | "register";

export default function Home() {
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<"INSTRUCTOR" | "STUDENT">("STUDENT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loggedInRole, setLoggedInRole] = useState<string | null>(
    typeof window !== "undefined" ? getRole() : null
  );

  async function onLogin() {
    setMsg(null);
    try {
      const r = await login(email, password);
      const payload = decodeJwt(r.idToken);
      const userRole = payload["custom:role"] || "STUDENT";
      setSession(r.idToken, userRole, payload.sub);
      setLoggedInRole(userRole);
      // Redirect immediately based on role
      window.location.href = userRole === "INSTRUCTOR" ? "/instructor/" : "/student/";
    } catch (e: any) {
      setMsg({ text: e.message, ok: false });
    }
  }

  async function onRegister() {
    setMsg(null);
    try {
      const body: Record<string, unknown> = { email, password, displayName, role };
      if (role === "STUDENT" && joinCode) body.joinCode = joinCode;
      await register(body);
      await onLogin();
    } catch (e: any) {
      setMsg({ text: `Registration failed: ${e.message}`, ok: false });
    }
  }

  function onLogout() {
    clearSession();
    setLoggedInRole(null);
    setMsg(null);
  }

  return (
    <div style={{ maxWidth: 480, margin: "60px auto", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 4 }}>Welcome to ProcessCanvas</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        Sort real-estate-development activities into the right process phases.
      </p>

      {loggedInRole ? (
        <div className="card" style={{ textAlign: "center" }}>
          <p>
            Logged in as <strong>{loggedInRole}</strong>.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
            <button
              onClick={() =>
                (window.location.href =
                  loggedInRole === "INSTRUCTOR" ? "/instructor/" : "/student/")
              }
            >
              Go to dashboard
            </button>
            <button
              onClick={onLogout}
              style={{ background: "#757575" }}
            >
              Log out
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          {/* Role radio buttons */}
          <div style={{ display: "flex", gap: 24, marginBottom: 20 }}>
            {(["INSTRUCTOR", "STUDENT"] as const).map((r) => (
              <label
                key={r}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontWeight: role === r ? 700 : 400,
                  fontSize: 15,
                }}
              >
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                {r.charAt(0) + r.slice(1).toLowerCase()}
              </label>
            ))}
          </div>

          {/* Login / Register toggle */}
          <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "2px solid #e0e0e0" }}>
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setMsg(null); }}
                style={{
                  background: "none",
                  color: mode === m ? "#1565c0" : "#777",
                  fontWeight: mode === m ? 700 : 400,
                  borderRadius: 0,
                  borderBottom: mode === m ? "2px solid #1565c0" : "none",
                  marginBottom: -2,
                  padding: "8px 16px",
                  fontSize: 14,
                }}
              >
                {m === "login" ? "Log in" : "Register"}
              </button>
            ))}
          </div>

          <label>Email</label>
          <input
            data-testid={mode === "login" ? "login-email" : "email"}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%" }}
          />

          <label>Password</label>
          <input
            data-testid={mode === "login" ? "login-password" : "password"}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%" }}
          />

          {mode === "register" && (
            <>
              <label>Display name</label>
              <input
                data-testid="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={{ width: "100%" }}
              />
              <small style={{ color: "#666" }}>
                Password must be at least 8 characters and include a letter and number.
              </small>
              {role === "STUDENT" && (
                <>
                  <label>Join code (optional)</label>
                  <input
                    data-testid="joinCode"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </>
              )}
            </>
          )}

          <div style={{ marginTop: 16 }}>
            <button
              data-testid={mode === "login" ? "login-button" : "register-button"}
              onClick={mode === "login" ? onLogin : onRegister}
              style={{ width: "100%" }}
            >
              {mode === "login" ? `Log in as ${role.charAt(0) + role.slice(1).toLowerCase()}` : "Register & Continue"}
            </button>
          </div>

          {msg && (
            <p
              className={msg.ok ? "ok" : "error"}
              data-testid="auth-msg"
              style={{ marginTop: 12 }}
            >
              {msg.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
