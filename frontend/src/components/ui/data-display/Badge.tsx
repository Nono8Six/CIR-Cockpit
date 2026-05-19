import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * CIR badge primitive.
 * Use `variant` for state semantics and `density` for visual compactness.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-md border font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        warning:
          "border-transparent bg-warning text-warning-foreground shadow hover:bg-warning/80",
        success:
          "border-transparent bg-success text-success-foreground shadow hover:bg-success/90",
        ghost: "border-transparent bg-transparent text-muted-foreground",
        outline: "text-foreground",
      },
      density: {
        dense: "px-2 py-0.5 text-xs",
        comfortable: "px-2.5 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      density: "dense",
    },
  }
)

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
  }

function Badge({ className, variant, density, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : "div"

  return (
    <Comp
      className={cn(badgeVariants({ variant, density }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
