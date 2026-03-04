"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { typography } from "@/config/visual-effects";

export interface ToastProps {
  id?: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning";
  duration?: number;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const Toast: React.FC<ToastProps> = ({
  title,
  description,
  variant = "default",
  onClose,
  action,
}) => {
  return (
    <div
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border border-gray-700 bg-gray-900 p-6 pr-8 shadow-lg transition-all",
        {
          "border-gray-600": variant === "default",
          "border-green-500 bg-green-900/20": variant === "success",
          "border-red-600 bg-red-900/20": variant === "error",
          "border-yellow-500 bg-yellow-900/20": variant === "warning",
        }
      )}
    >
      <div className="grid gap-1 flex-1">
        {title && (
          <div className={cn(typography.fontSize.sm, "font-semibold text-gray-100")}>{title}</div>
        )}
        {description && (
          <div className={cn(typography.fontSize.sm, "text-gray-400")}>{description}</div>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className={cn(
              "mt-2 w-fit rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              {
                "bg-blue-600 text-white hover:bg-blue-700": variant === "default" || variant === "error",
                "bg-green-600 text-white hover:bg-green-700": variant === "success",
                "bg-yellow-600 text-white hover:bg-yellow-700": variant === "warning",
              }
            )}
          >
            {action.label}
          </button>
        )}
      </div>
      {onClose && (
        <button
          className={cn(
            "absolute right-2 top-2 rounded-md p-1 text-gray-400 opacity-0 transition-opacity hover:text-gray-200 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
          )}
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

Toast.displayName = "Toast";

export { Toast };

