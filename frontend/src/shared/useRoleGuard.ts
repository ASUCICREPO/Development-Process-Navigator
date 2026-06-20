"use client";
import { useEffect, useState } from "react";
import { getRole, getToken, getViewAs } from "./session";

/**
 * Checks if the user is logged in and allowed to view the page.
 * Instructors can view student pages via "VIEW AS" toggle.
 * Returns false while checking (render nothing), true once verified.
 */
export function useRoleGuard(required: "INSTRUCTOR" | "STUDENT"): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = getToken();
    const actualRole = getRole();
    const viewAs = getViewAs();

    if (!token || !actualRole) {
      window.location.href = "/";
      return;
    }

    // Instructors can view any page via VIEW AS toggle
    if (actualRole === "INSTRUCTOR") {
      setAllowed(true);
      return;
    }

    // Students can only access student pages
    if (actualRole === "STUDENT" && required === "STUDENT") {
      setAllowed(true);
      return;
    }

    // Students cannot access instructor pages
    window.location.href = "/";
  }, [required]);

  return allowed;
}
