"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface InfoIconProps {
    tooltip: string;
    size?: number;
    /** Stroke/text colour of the icon (use "#fff" on dark/coloured headers). */
    color?: string;
    /** Accessible label; defaults to "More info". */
    label?: string;
    /** Optional heading shown at the top of the pop-up when it is opened by click. */
    title?: string;
}

const POPUP_WIDTH = 260;
const GAP = 8;
const MARGIN = 8; // keep the pop-up this far from the viewport edge

type Pos = { left: number; top: number; below: boolean; arrowLeft: number };

/**
 * Small "i" info icon.
 * - Hover / keyboard focus: quick preview of the text.
 * - Click / Enter: opens a pop-up that stays open until the × button,
 *   a click outside, or Escape.
 * The pop-up uses fixed positioning so it is never clipped by scrolling or
 * overflow-hidden containers, and flips below the icon near the top of the screen.
 */
export const InfoIcon: React.FC<InfoIconProps> = ({ tooltip, size = 16, color = "#8C1D40", label, title }) => {
    const [hover, setHover] = useState(false);
    const [pinned, setPinned] = useState(false);
    const [pos, setPos] = useState<Pos | null>(null);
    const anchorRef = useRef<HTMLSpanElement>(null);
    const popupRef = useRef<HTMLSpanElement>(null);
    const show = hover || pinned;

    const place = useCallback(() => {
        const el = anchorRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const center = r.left + r.width / 2;
        const left = Math.min(
            Math.max(MARGIN, center - POPUP_WIDTH / 2),
            window.innerWidth - POPUP_WIDTH - MARGIN,
        );
        const below = r.top < 160; // not enough room above -> show underneath
        setPos({ left, top: below ? r.bottom + GAP : r.top - GAP, below, arrowLeft: center - left });
    }, []);

    function preview(on: boolean) {
        if (on) place();
        setHover(on);
    }

    function togglePinned() {
        if (pinned) {
            setPinned(false);
            setHover(false);
        } else {
            place();
            setPinned(true);
        }
    }

    // Keep the pop-up attached to the icon while the page scrolls/resizes.
    useEffect(() => {
        if (!show) return;
        window.addEventListener("scroll", place, true);
        window.addEventListener("resize", place);
        return () => {
            window.removeEventListener("scroll", place, true);
            window.removeEventListener("resize", place);
        };
    }, [show, place]);

    // Close a pinned pop-up on outside click or Escape.
    useEffect(() => {
        if (!pinned) return;
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (anchorRef.current?.contains(t) || popupRef.current?.contains(t)) return;
            setPinned(false);
            setHover(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") { setPinned(false); setHover(false); }
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [pinned]);

    return (
        <span
            ref={anchorRef}
            role="button"
            tabIndex={0}
            aria-label={label ?? "More info"}
            aria-expanded={pinned}
            style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: 6, cursor: "pointer", flexShrink: 0 }}
            onMouseEnter={() => preview(true)}
            onMouseLeave={() => preview(false)}
            onFocus={() => preview(true)}
            onBlur={() => preview(false)}
            onClick={(e) => { e.stopPropagation(); togglePinned(); }}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); togglePinned(); }
            }}
        >
            <svg
                width={size}
                height={size}
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                <circle cx="10" cy="10" r="9" stroke={color} strokeWidth="1.5" fill={pinned ? "rgba(255,255,255,0.2)" : "none"} />
                <text
                    x="10"
                    y="14.5"
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill={color}
                    fontFamily="sans-serif"
                >
                    i
                </text>
            </svg>
            {show && pos && (
                <span
                    ref={popupRef}
                    role={pinned ? "dialog" : "tooltip"}
                    aria-label={title ?? label ?? "More info"}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: "fixed",
                        left: pos.left,
                        top: pos.top,
                        transform: pos.below ? "none" : "translateY(-100%)",
                        background: "#1a1a1a",
                        color: "#fff",
                        padding: pinned ? "10px 30px 12px 14px" : "8px 12px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 400,
                        lineHeight: 1.45,
                        whiteSpace: "normal",
                        width: POPUP_WIDTH,
                        textAlign: "left",
                        textTransform: "none",
                        letterSpacing: "normal",
                        boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
                        zIndex: 1000,
                        cursor: "default",
                        pointerEvents: pinned ? "auto" : "none",
                    }}
                >
                    {pinned && title && (
                        <span style={{ display: "block", fontWeight: 700, fontSize: 13, color: "#FFC627", marginBottom: 4 }}>
                            {title}
                        </span>
                    )}
                    {tooltip}
                    {pinned && (
                        <button
                            type="button"
                            aria-label="Close"
                            onClick={(e) => { e.stopPropagation(); setPinned(false); setHover(false); }}
                            style={{
                                position: "absolute", top: 4, right: 6, background: "none", border: "none",
                                color: "#d1d5db", fontSize: 18, lineHeight: 1, cursor: "pointer", padding: 2,
                            }}
                        >
                            ×
                        </button>
                    )}
                    <span
                        style={{
                            position: "absolute",
                            [pos.below ? "bottom" : "top"]: "100%",
                            left: pos.arrowLeft,
                            transform: "translateX(-50%)",
                            border: "6px solid transparent",
                            [pos.below ? "borderBottomColor" : "borderTopColor"]: "#1a1a1a",
                        }}
                    />
                </span>
            )}
        </span>
    );
};
