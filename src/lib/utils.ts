import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind classes safely, resolving conflicts.
 * Required by every shadcn/ui component.
 *
 * Example:
 *   cn("px-4 py-2", condition && "bg-blue-500", "px-6")
 *   → "py-2 bg-blue-500 px-6"  (px-4 is correctly overridden by px-6)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
