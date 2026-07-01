"use client";
import React, { useState } from "react";
import { register, login, setSession, getRole, clearSession, API_BASE } from "../src/shared/session";

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
  const [instructorCode, setInstructorCode] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loggedInRole, setLoggedInRole] = useState<string | null>(
    typeof window !== "undefined" ? getRole() : null
  );

  async function onLogin() {
    setMsg(null);
    setLoading(true);
    try {
      const r = await login(email, password);
      const payload = decodeJwt(r.idToken);
      const userRole = payload["custom:role"] || "STUDENT";
      setSession(r.idToken, userRole, payload.sub);
      // Fetch display name from backend
      try {
        const meRes = await fetch(`${API_BASE.replace(/\/$/, "")}/me`, {
          headers: { Authorization: `Bearer ${r.idToken}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          localStorage.setItem("pc_displayName", me.displayName || email.split("@")[0]);
        } else {
          localStorage.setItem("pc_displayName", displayName || email.split("@")[0]);
        }
      } catch {
        localStorage.setItem("pc_displayName", displayName || email.split("@")[0]);
      }
      setLoggedInRole(userRole);
      window.location.href = userRole === "INSTRUCTOR" ? "/instructor/" : "/student/";
    } catch (e: any) {
      setMsg({ text: e.message, ok: false });
    } finally {
      setLoading(false);
    }
  }

  async function onRegister() {
    setMsg(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = { email, password, displayName, role };
      if (role === "STUDENT" && joinCode) body.joinCode = joinCode;
      if (role === "INSTRUCTOR") body.instructorCode = instructorCode;
      await register(body);
      localStorage.setItem("pc_displayName", displayName || email.split("@")[0]);
      await onLogin();
    } catch (e: any) {
      setMsg({ text: e.message, ok: false });
      setLoading(false);
    }
  }

  function onLogout() {
    clearSession();
    setLoggedInRole(null);
    setMsg(null);
  }

  if (loggedInRole) {
    // Auto-redirect to dashboard
    if (typeof window !== "undefined") {
      window.location.href = loggedInRole === "INSTRUCTOR" ? "/instructor/" : "/student/";
    }
    return null;
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoSection}>
          <div style={styles.logoRow}>
            <img src="/images/asu-logo.png" alt="ASU W.P. Carey School of Business" style={{ height: 44 }} />
          </div>
        </div>

        <h2 style={styles.title}>Development Process Navigator</h2>
        <p style={styles.subtitle}>
          Sequence real-estate development activities into the correct process phases.
        </p>

        {/* Role Toggle */}
        <div style={styles.roleToggle}>
          {(["STUDENT", "INSTRUCTOR"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                ...styles.roleBtn,
                background: role === r ? (r === "STUDENT" ? "#FFC627" : "#8C1D40") : "#f3f4f6",
                color: role === r ? (r === "STUDENT" ? "#1a1a1a" : "#fff") : "#6b7280",
                fontWeight: role === r ? 700 : 500,
              }}
            >
              {r.charAt(0) + r.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Warning for students trying to register as instructor */}
        {mode === "register" && role === "INSTRUCTOR" && (
          <div style={styles.warningBanner}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <div>
              <strong style={{ color: "#92400e", fontSize: 13 }}>Instructor accounts are restricted</strong>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#78350f" }}>
                Only authorized faculty can register as instructors. If you&apos;re a student, please select &quot;Student&quot; above.
              </p>
            </div>
          </div>
        )}

        {/* Mode Tabs */}
        <div style={styles.modeTabs}>
          <button
            onClick={() => { setMode("login"); setMsg(null); }}
            style={mode === "login" ? styles.modeActive : styles.modeInactive}
          >
            Log in
          </button>
          <button
            onClick={() => { setMode("register"); setMsg(null); }}
            style={mode === "register" ? styles.modeActive : styles.modeInactive}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <div style={styles.formSection}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@asu.edu"
            style={styles.input}
          />

          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={styles.input}
          />
          <p style={styles.hint}>
            Password: min 8 characters, include a letter and number.
          </p>

          {mode === "register" && (
            <>
              <label style={styles.label}>Display Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                style={styles.input}
              />

              {role === "STUDENT" && (
                <>
                  <label style={styles.label}>Join Code (optional)</label>
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="e.g. ASU-2026"
                    style={styles.input}
                  />
                </>
              )}
              {role === "INSTRUCTOR" && (
                <>
                  <label style={styles.label}>Instructor Access Code</label>
                  <input
                    value={instructorCode}
                    onChange={(e) => setInstructorCode(e.target.value)}
                    placeholder="Enter access code"
                    style={styles.input}
                  />
                  <p style={styles.hint}>
                    Contact your department administrator if you don&apos;t have a code.
                  </p>
                </>
              )}
            </>
          )}

          <button
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            onClick={mode === "login" ? onLogin : onRegister}
            disabled={loading}
          >
            {loading ? "Please wait..." : mode === "login"
              ? `Log in as ${role.charAt(0) + role.slice(1).toLowerCase()}`
              : "Create Account"}
          </button>

          {msg && (
            <p style={{ ...styles.msg, color: msg.ok ? "#16a34a" : "#ef4444" }}>
              {msg.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
    padding: "24px",
    paddingTop: 80,
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    padding: "40px 44px",
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
  },
  logoSection: {
    textAlign: "center" as const,
    marginBottom: 20,
  },
  logoRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  asuText: {
    fontSize: 22,
    fontWeight: 800,
    color: "#8C1D40",
  },
  wpText: {
    fontSize: 18,
    fontWeight: 700,
    color: "#BF9B30",
  },
  schoolText: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "#111827",
    textAlign: "center" as const,
    margin: "0 0 6px",
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center" as const,
    marginBottom: 24,
    lineHeight: 1.4,
  },
  roleToggle: {
    display: "flex",
    gap: 0,
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid #e5e7eb",
    marginBottom: 20,
  },
  roleBtn: {
    flex: 1,
    padding: "10px 0",
    fontSize: 14,
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  modeTabs: {
    display: "flex",
    gap: 0,
    borderBottom: "2px solid #e5e7eb",
    marginBottom: 20,
  },
  modeActive: {
    background: "none",
    border: "none",
    borderBottom: "2px solid #8C1D40",
    color: "#8C1D40",
    fontWeight: 700,
    padding: "8px 20px",
    fontSize: 14,
    cursor: "pointer",
    marginBottom: -2,
  },
  modeInactive: {
    background: "none",
    border: "none",
    color: "#6b7280",
    fontWeight: 400,
    padding: "8px 20px",
    fontSize: 14,
    cursor: "pointer",
    marginBottom: -2,
  },
  formSection: {},
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 4,
    marginTop: 14,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.15s",
  },
  hint: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
    marginBottom: 0,
  },
  submitBtn: {
    width: "100%",
    marginTop: 20,
    padding: "12px",
    background: "#8C1D40",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  msg: {
    textAlign: "center" as const,
    marginTop: 12,
    fontSize: 13,
  },
  primaryBtn: {
    width: "100%",
    padding: "12px",
    background: "#8C1D40",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryBtn: {
    width: "100%",
    padding: "12px",
    background: "#FFC627",
    color: "#1a1a1a",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  logoutBtn: {
    width: "100%",
    padding: "12px",
    background: "#f3f4f6",
    color: "#374151",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  warningBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 8,
    padding: "12px 14px",
    marginBottom: 16,
  },
};
