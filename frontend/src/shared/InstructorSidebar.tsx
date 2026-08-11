"use client";
import React, { useState } from "react";

interface InstructorSidebarProps {
    activeItem?: string;
}

const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊", href: "/instructor/" },
    { id: "exercises", label: "My Exercises", icon: "📝", href: "/instructor/exercises" },
    { id: "roster", label: "Student Roster", icon: "👥", href: "/instructor/roster" },
    { id: "results", label: "Results & History", icon: "📈", href: "/instructor/results" },
    { id: "tutorial", label: "Help", icon: "❓", href: "/tutorial" },
];

export const InstructorSidebar: React.FC<InstructorSidebarProps> = ({ activeItem = "dashboard" }) => {
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
