"use client";
import React, { useEffect, useState } from "react";

export interface SidebarNavItem {
    id: string;
    label: string;
    icon: string;
    href: string;
}

interface SidebarBaseProps {
    items: SidebarNavItem[];
    activeItem?: string;
}

// Shared across student and instructor pages so the choice survives navigation
// (each nav link is a full page load in the static export).
const STORAGE_KEY = "pc_sidebarCollapsed";

/**
 * Left navigation rail used by both the student and instructor layouts.
 * When collapsed it shrinks to an icon-only rail; `.main-content` (a later
 * sibling) follows it via CSS, so pages need no extra wiring.
 */
export const SidebarBase: React.FC<SidebarBaseProps> = ({ items, activeItem = "dashboard" }) => {
    const [collapsed, setCollapsed] = useState(false);

    // Read the saved state after mount to avoid a static-export hydration mismatch.
    useEffect(() => {
        try {
            setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
        } catch {
            /* storage unavailable: default to expanded */
        }
    }, []);

    function toggle() {
        setCollapsed((c) => {
            const next = !c;
            try {
                localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
            } catch {
                /* ignore */
            }
            return next;
        });
    }

    return (
        <aside className={`sidebar ${collapsed ? "collapsed" : ""}`} aria-label="Main navigation">
            <div className="sidebar-toggle-row">
                <button
                    type="button"
                    className="sidebar-toggle"
                    onClick={toggle}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-expanded={!collapsed}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? "»" : "«"}
                </button>
            </div>
            <ul className="sidebar-nav">
                {items.map((item) => {
                    const isActive = activeItem === item.id;
                    return (
                        <li key={item.id}>
                            <a
                                href={item.href}
                                className={isActive ? "active" : ""}
                                aria-current={isActive ? "page" : undefined}
                                aria-label={collapsed ? item.label : undefined}
                                title={collapsed ? item.label : undefined}
                            >
                                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                                <span className="nav-label">{item.label}</span>
                            </a>
                        </li>
                    );
                })}
            </ul>
        </aside>
    );
};
