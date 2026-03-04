"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { animationDurations } from "@/config/visual-effects";

interface VideoSuccessBadgeProps {
  show: boolean;
  position?: { x: number; y: number };
}

/**
 * VideoSuccessBadge Component
 * Shows a checkmark badge when a video transcript is successfully fetched
 * Matches PRD Section 5.2.5 specifications
 */
export function VideoSuccessBadge({
  show,
  position = { x: 0, y: 0 },
}: VideoSuccessBadgeProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 0 }}
          animate={{ opacity: 1, scale: 1, y: -20 }}
          exit={{ opacity: 0, scale: 0.5, y: -40 }}
          transition={{ duration: animationDurations.videoSuccessBadge, ease: "easeOut" as const }}
          className="absolute pointer-events-none z-10"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
        >
          <CheckCircle className="w-6 h-6 text-gray-300" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

