"use client";
import { useEffect } from "react";
import { getRole, getToken } from "./session";

/**
 * Redirects to / if the user is not logged in or doesn't have the required role.
 */
export function useRoleGuard(required: "INSTRUCTOR" | "STUDENT") {
  useEffect(() => {
    const token = getToken();
    const role = getRole();
    if (!token || role !== required) {
      window.location.href = "/";
    }
  }, [required]);
}
