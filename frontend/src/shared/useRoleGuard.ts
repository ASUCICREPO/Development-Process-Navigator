"use client";
import { useEffect, useState } from "react";
import { getRole, getToken } from "./session";

/**
 * Redirects to / if the user is not logged in or doesn't have the required role.
 * Returns false while checking (render nothing), true once verified.
 */
export function useRoleGuard(required: "INSTRUCTOR" | "STUDENT"): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = getToken();
    const role = getRole();
    if (!token || role !== required) {
      window.location.href = "/";
    } else {
      setAllowed(true);
    }
  }, [required]);

  return allowed;
}
