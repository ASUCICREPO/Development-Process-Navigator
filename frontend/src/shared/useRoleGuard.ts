"use client";
import { useEffect, useState } from "react";
import { getRole, getToken } from "./session";

/**
 * Checks if the user is logged in and allowed to view the page.
 * Instructors can view student pages via "VIEW AS" toggle.
 * Students get a warning notification if they try to access instructor pages.
 * Returns false while checking (render nothing), true once verified.
 */
export function useRoleGuard(required: "INSTRUCTOR" | "STUDENT"): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Small delay to allow localStorage to sync after redirect
    const check = () => {
      const token = getToken();
      const actualRole = getRole();

      if (!token || !actualRole) {
        // Not logged in — redirect to login
        window.location.href = "/";
        return;
      }

      // Instructors can view any page
      if (actualRole === "INSTRUCTOR") {
        setAllowed(true);
        return;
      }

      // Students can only access student pages
      if (actualRole === "STUDENT" && required === "STUDENT") {
        setAllowed(true);
        return;
      }

      // Students trying to access instructor pages — show notification then redirect
      if (actualRole === "STUDENT" && required === "INSTRUCTOR") {
        showAccessDeniedNotification();
        setTimeout(() => {
          window.location.href = "/student/";
        }, 2500);
        return;
      }

      window.location.href = "/";
    };

    // Check immediately, if no token retry once after brief delay (handles post-login race)
    const token = getToken();
    if (token) {
      check();
    } else {
      setTimeout(check, 100);
    }
  }, [required]);

  return allowed;
}

function showAccessDeniedNotification() {
  // Prevent duplicate notifications
  if (document.getElementById("access-denied-toast")) return;

  const notification = document.createElement("div");
  notification.id = "access-denied-toast";
  notification.innerHTML = `
    <div style="
      position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
      background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444;
      border-radius: 8px; padding: 16px 24px; z-index: 9999;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12); display: flex; align-items: center; gap: 12px;
      max-width: 480px; animation: slideDown 0.3s ease-out;
    ">
      <span style="font-size: 20px;">⚠️</span>
      <div>
        <div style="font-weight: 700; color: #991b1b; font-size: 14px;">Access Restricted</div>
        <div style="color: #7f1d1d; font-size: 13px; margin-top: 2px;">
          Instructor features are only available to instructor accounts. Redirecting to your dashboard...
        </div>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideDown {
      from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
    style.remove();
  }, 3000);
}
