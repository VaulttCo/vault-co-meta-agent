/**
 * shadcn/ui Button primitive — foundation test component.
 *
 * This is the standard shadcn Button, installed manually to confirm
 * class-variance-authority, clsx, tailwind-merge, and @radix-ui/react-slot
 * all resolve correctly in this project.
 *
 * Do NOT use this for Vault Co CTA buttons — use VCButton from VaultUI.tsx
 * or the raw orange/blue button pattern.
 * This component exists as a base to extend for future shadcn components
 * (Dialog, Tooltip, Sheet, etc.) that depend on the Button as a trigger.
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:     "bg-[#0081f2] text-white shadow hover:bg-[#0070d4]",
        destructive: "bg-[#ef4444] text-white shadow-sm hover:bg-[#dc2626]",
        outline:     "border border-[var(--t-border)] bg-transparent shadow-sm hover:bg-[var(--t-surface-2)] text-[var(--t-text)]",
        secondary:   "bg-[var(--t-surface-2)] text-[var(--t-text)] shadow-sm hover:bg-[var(--t-surface-3)]",
        ghost:       "hover:bg-[var(--t-surface-2)] text-[var(--t-muted)]",
        link:        "text-[#0081f2] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-8 rounded-md px-3 text-xs",
        lg:      "h-10 rounded-md px-8",
        icon:    "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
