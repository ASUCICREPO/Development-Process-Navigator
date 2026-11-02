"use client";
import React from "react";
import { SidebarBase, SidebarNavItem } from "./SidebarBase";

interface SidebarProps {
    activeItem?: string;
}

const navItems: SidebarNavItem[] = [
    { id: "dashboard", label: "My Dashboard", icon: "📊", href: "/student/" },
    { id: "exercise", label: "Current Exercise", icon: "📝", href: "/student/exercise" },
    { id: "history", label: "My History", icon: "📋", href: "/student/history" },
    { id: "scores", label: "My Scores", icon: "🏆", href: "/student/scores" },
    { id: "tutorial", label: "Help", icon: "❓", href: "/tutorial" },
];

/** Student navigation rail. */
export const Sidebar: React.FC<SidebarProps> = ({ activeItem = "dashboard" }) => (
    <SidebarBase items={navItems} activeItem={activeItem} />
);
