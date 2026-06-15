"use client";
import React, { useState } from "react";
import { register, login, setSession, getRole } from "../src/shared/session";

// base64url-safe JWT payload decode (Cognito tokens use base64url, which atob() can't handle raw).
function decodeJwt(token: string): any {
  const part = token.split(".")[1];
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  return JSON.parse(decodeURIComponent(escape(atob(b64 + pad))));
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("INSTRUCTOR");
  const [joinCode, setJoinCode] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loggedInRole, setLoggedInRole] = useState<string | null>(
    typeof window !== "undefined" ? getRole() : null
  );

  async function onRegister() {
    setMsg(null);
    try {
      const body: Record<string, unknown> = { email, password, displayName, role };
      if (role === "STUDENT" && joinCode) body.joinCode = joinCode;
      await register(body);
      // Auto-login right after a successful registration for a smooth flow.
      await onLogin();
    } catch (e: any) {
      setMsg({ text: `Registration failed: ${e.message}`, ok: false });
    }
  }

  async function onLogin() {
    try {
      const r = await login(email, password);
      const payload = decodeJwt(r.idToken);
      const userRole = payload["custom:role"] || "STUDENT";
      setSession(r.idToken, userRole, payload.sub);
      setLoggedInRole(userRole);
      setMsg({ text: `Logged in as ${userRole}.`, ok: true });
    } catch (e: any) {
      setMsg({ text: e.message, ok: false });
    }
  }

  return (
    <div>
      <h1>Welcome to ProcessCanvas</h1>
      <p>Sort real-estate-development activities into the right process phases.</p>

      {loggedInRole && (
        <div className="card ok" data-testid="logged-in-banner">
          You are logged in as <strong>{loggedInRole}</strong>. Go to{" "}
          <a href={loggedInRole === "INSTRUCTOR" ? "/instructor/" : "/student/"}>
            your {loggedInRole.toLowerCase()} page
          </a>.
        </div>
      )}

      <div className="card">
        <h2>New here? Register (then you're logged in automatically)</h2>
        <label>Email</label>
        <input data-testid="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input data-testid="password" type="password" value={password}
               onChange={(e) => setPassword(e.target.value)} />
        <small>Password must be at least 8 characters and include both letters and a number (e.g. <code>Passw0rd123</code>).</small>
        <label>Display name</label>
        <input data-testid="displayName" value={displayName}
               onChange={(e) => setDisplayName(e.target.value)} />
        <label>Role</label>
        <select data-testid="role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="INSTRUCTOR">Instructor</option>
          <option value="STUDENT">Student</option>
        </select>
        {role === "STUDENT" && (
          <>
            <label>Join code (optional)</label>
            <input data-testid="joinCode" value={joinCode}
                   onChange={(e) => setJoinCode(e.target.value)} />
          </>
        )}
        <div style={{ marginTop: 12 }}>
          <button data-testid="register-button" onClick={onRegister}>Register &amp; Continue</button>
        </div>
      </div>

      <div className="card">
        <h2>Already have an account? Log in</h2>
        <label>Email</label>
        <input data-testid="login-email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input data-testid="login-password" type="password" value={password}
               onChange={(e) => setPassword(e.target.value)} />
        <div style={{ marginTop: 12 }}>
          <button data-testid="login-button" onClick={onLogin}>Login</button>
        </div>
      </div>

      {msg && <p className={msg.ok ? "ok" : "error"} data-testid="auth-msg">{msg.text}</p>}
    </div>
  );
}
