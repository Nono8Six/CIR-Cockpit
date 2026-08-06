import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * CIR button primitive.
 * Use `variant` for semantic intent and `size` for density.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-[13px] font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-none hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-none hover:bg-destructive/90",
        warning:
          "bg-warning text-warning-foreground shadow-none hover:bg-warning/90",
        success:
          "bg-success text-success-foreground shadow-none hover:bg-success/90",
        outline:
          "border border-input bg-background shadow-none hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-none hover:bg-secondary/80",
        // Action primaire neutre : libere le rouge CIR pour la seule semantique
        // d'etat bloquant, dans les ecrans ou les deux se cotoieraient.
        solid:
          "bg-foreground text-background shadow-none hover:bg-foreground/85",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3 text-xs",
        dense: "h-8 px-2.5 text-xs",
        comfortable: "h-9 px-4 text-sm",
        sm: "h-8 px-2.5 text-xs",
        lg: "h-10 px-8 text-sm",
        icon: "h-8 w-8 p-0",
        control: "h-8 w-8 p-0",
        toolbar: "h-8 px-2.5 text-xs",
        dataRow: "h-7 px-2 text-[11px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
