"use client";
import React, { useState } from "react";

interface SidebarProps {
    activeItem?: string;
}

const navItems = [
    { id: "dashboard", label: "My Dashboard", icon: "📊", href: "/student/" },
    { id: "exercise", label: "Current Exercise", icon: "📝", href: "/student/exercise" },
    { id: "history", label: "My History", icon: "📋", href: "/student/history" },
    { id: "scores", label: "My Scores", icon: "🏆", href: "/student/scores" },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeItem = "dashboard" }) => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
            <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
                {collapsed ? "▶" : "◀"}
            </button>
            <ul className="sidebar-nav">
                {navItems.map((item) => (
                    <li key={item.id}>
                        <a
                            href={item.href}
                            className={activeItem === item.id ? "active" : ""}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {!collapsed && <span>{item.label}</span>}
                        </a>
                    </li>
                ))}
            </ul>
        </aside>
    );
};
