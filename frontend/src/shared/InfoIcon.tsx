"use client";
import React, { useState } from "react";

interface InfoIconProps {
    tooltip: string;
    size?: number;
}

/**
 * Small "i" info icon that shows a tooltip on hover/click.
 * Use next to any UI element that needs contextual help.
 */
export const InfoIcon: React.FC<InfoIconProps> = ({ tooltip, size = 16 }) => {
    const [show, setShow] = useState(false);

    return (
        <span
            style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: 6, cursor: "pointer" }}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            onClick={() => setShow(!show)}
        >
            <svg
                width={size}
                height={size}
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Info"
            >
                <circle cx="10" cy="10" r="9" stroke="#8C1D40" strokeWidth="1.5" fill="none" />
                <text
                    x="10"
                    y="14.5"
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill="#8C1D40"
                    fontFamily="sans-serif"
                >
                    i
                </text>
            </svg>
            {show && (
                <span
                    style={{
                        position: "absolute",
                        bottom: "calc(100% + 8px)",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "#1a1a1a",
                        color: "#fff",
                        padding: "8px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        lineHeight: 1.4,
                        whiteSpace: "normal",
                        width: 220,
                        textAlign: "center",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                        zIndex: 500,
                        pointerEvents: "none",
                    }}
                >
                    {tooltip}
                    <span
                        style={{
                            position: "absolute",
                            top: "100%",
                            left: "50%",
                            transform: "translateX(-50%)",
                            border: "5px solid transparent",
                            borderTopColor: "#1a1a1a",
                        }}
                    />
                </span>
            )}
        </span>
    );
};
