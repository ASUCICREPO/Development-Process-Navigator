"use client";
import React from "react";
import { SidebarBase, SidebarNavItem } from "./SidebarBase";

interface InstructorSidebarProps {
    activeItem?: string;
}

const navItems: SidebarNavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: "📊", href: "/instructor/" },
    { id: "exercises", label: "My Exercises", icon: "📝", href: "/instructor/exercises" },
    { id: "roster", label: "Student Roster", icon: "👥", href: "/instructor/roster" },
    { id: "results", label: "Results & History", icon: "📈", href: "/instructor/results" },
    { id: "tutorial", label: "Help", icon: "❓", href: "/tutorial" },
];

/** Instructor navigation rail. */
export const InstructorSidebar: React.FC<InstructorSidebarProps> = ({ activeItem = "dashboard" }) => (
    <SidebarBase items={navItems} activeItem={activeItem} />
);
