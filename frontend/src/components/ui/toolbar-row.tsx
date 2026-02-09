import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * CIR toolbar row primitive.
 * Use this to align toolbar actions and filters consistently across screens.
 */
const toolbarRowVariants = cva(
  "flex w-full flex-wrap items-start gap-3 md:items-center md:justify-between",
  {
    variants: {
      density: {
        dense: "gap-2",
        comfortable: "gap-3",
      },
    },
    defaultVariants: {
      density: "comfortable",
    },
  }
)

export interface ToolbarRowProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toolbarRowVariants> {}

const ToolbarRow = React.forwardRef<HTMLDivElement, ToolbarRowProps>(
  ({ className, density, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(toolbarRowVariants({ density }), className)}
      {...props}
    />
  )
)
ToolbarRow.displayName = "ToolbarRow"

export { ToolbarRow, toolbarRowVariants }
