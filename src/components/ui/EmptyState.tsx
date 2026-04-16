"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Compass } from "lucide-react";

export default function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center text-center py-20 px-6"
    >
      <motion.div
        animate={{ y: [0, -8, 0], rotate: [0, 4, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="mb-5"
        style={{
          width: 88,
          height: 88,
          borderRadius: 9999,
          background: "var(--brand-gradient)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--glow-brand)",
          color: "#fff",
        }}
      >
        {icon ?? <Compass size={40} strokeWidth={1.8} />}
      </motion.div>
      <p
        className="font-display text-2xl"
        style={{ color: "var(--fg)" }}
      >
        {title}
      </p>
      {message && (
        <p
          className="mt-2 max-w-sm text-sm"
          style={{ color: "var(--fg-muted)" }}
        >
          {message}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
