"use client";
import React, { useEffect, useRef, useState } from "react";

interface InfoIconProps {
    tooltip: string;
    size?: number;
    /** Stroke/text colour of the icon (use "#fff" on dark/coloured headers). */
    color?: string;
    /** Accessible label; defaults to "More info". */
    label?: string;
}

const TOOLTIP_WIDTH = 240;
const GAP = 8;
const MARGIN = 8; // keep the tooltip this far from the viewport edge

/**
 * Small "i" info icon that shows a tooltip on hover, focus, or click.
 * The tooltip uses fixed positioning so it is never clipped by scrolling or
 * overflow-hidden containers, and flips below the icon near the top of the screen.
 */
export const InfoIcon: React.FC<InfoIconProps> = ({ tooltip, size = 16, color = "#8C1D40", label }) => {
    const [show, setShow] = useState(false);
    const [pos, setPos] = useState<{ left: number; top: number; below: boolean; arrowLeft: number } | null>(null);
    const anchorRef = useRef<HTMLSpanElement>(null);

    function open() {
        const el = anchorRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const center = r.left + r.width / 2;
        const left = Math.min(
            Math.max(MARGIN, center - TOOLTIP_WIDTH / 2),
            window.innerWidth - TOOLTIP_WIDTH - MARGIN,
        );
        const below = r.top < 140; // not enough room above -> show underneath
        setPos({ left, top: below ? r.bottom + GAP : r.top - GAP, below, arrowLeft: center - left });
        setShow(true);
    }

    function close() {
        setShow(false);
    }

    // A fixed tooltip would drift if the page scrolls, so hide it instead.
    useEffect(() => {
        if (!show) return;
        const hide = () => setShow(false);
        window.addEventListener("scroll", hide, true);
        window.addEventListener("resize", hide);
        return () => {
            window.removeEventListener("scroll", hide, true);
            window.removeEventListener("resize", hide);
        };
    }, [show]);

    return (
        <span
            ref={anchorRef}
            role="button"
            tabIndex={0}
            aria-label={label ?? "More info"}
            aria-expanded={show}
            style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: 6, cursor: "pointer", flexShrink: 0 }}
            onMouseEnter={open}
            onMouseLeave={close}
            onFocus={open}
            onBlur={close}
            onClick={(e) => { e.stopPropagation(); show ? close() : open(); }}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show ? close() : open(); }
                if (e.key === "Escape") close();
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
                <circle cx="10" cy="10" r="9" stroke={color} strokeWidth="1.5" fill="none" />
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
                    role="tooltip"
                    style={{
                        position: "fixed",
                        left: pos.left,
                        top: pos.top,
                        transform: pos.below ? "none" : "translateY(-100%)",
                        background: "#1a1a1a",
                        color: "#fff",
                        padding: "8px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 400,
                        lineHeight: 1.4,
                        whiteSpace: "normal",
                        width: TOOLTIP_WIDTH,
                        textAlign: "left",
                        textTransform: "none",
                        letterSpacing: "normal",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                        zIndex: 1000,
                        pointerEvents: "none",
                    }}
                >
                    {tooltip}
                    <span
                        style={{
                            position: "absolute",
                            [pos.below ? "bottom" : "top"]: "100%",
                            left: pos.arrowLeft,
                            transform: "translateX(-50%)",
                            border: "5px solid transparent",
                            [pos.below ? "borderBottomColor" : "borderTopColor"]: "#1a1a1a",
                        }}
                    />
                </span>
            )}
        </span>
    );
};
