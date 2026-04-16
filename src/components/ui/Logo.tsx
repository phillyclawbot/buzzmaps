"use client";

import Link from "next/link";
import { motion } from "framer-motion";

/**
 * BuzzMaps wordmark — pin glyph + gradient "Buzz" + ink "Maps".
 */
export default function Logo({
  href = "/",
  className = "",
  size = "md",
}: {
  href?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const textSize =
    size === "sm" ? "text-[15px]" : size === "lg" ? "text-2xl" : "text-[18px]";
  const pinSize = size === "sm" ? 16 : size === "lg" ? 28 : 20;

  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-1.5 transition-opacity ${className}`}
      aria-label="BuzzMaps home"
    >
      <motion.span
        whileHover={{ rotate: [0, -12, 10, -6, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={pinSize}
          height={pinSize * 1.2}
          viewBox="0 0 40 48"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="logo-pin" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff5b3a" />
              <stop offset="100%" stopColor="#ff8a3d" />
            </linearGradient>
          </defs>
          <path
            d="M20 1.5C10.6 1.5 3 9 3 18.3c0 11.8 12.5 24.2 15.8 27.2a1.8 1.8 0 0 0 2.4 0C24.5 42.5 37 30.1 37 18.3 37 9 29.4 1.5 20 1.5z"
            fill="url(#logo-pin)"
          />
          <circle cx="20" cy="18" r="5.5" fill="#fff" />
        </svg>
      </motion.span>
      <span
        className={`font-display font-semibold ${textSize}`}
        style={{ color: "var(--fg)", letterSpacing: "-0.02em" }}
      >
        <span className="text-gradient-brand">Buzz</span>Maps
      </span>
    </Link>
  );
}
