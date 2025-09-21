import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 ease-out ring-offset-background focus-visible:outline-none focus-visible:shadow-neo-inset disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-card text-card-foreground shadow-neo hover:shadow-neo-hover active:shadow-neo-inset",
        destructive:
          "bg-destructive text-destructive-foreground shadow-neo hover:shadow-neo-hover active:shadow-neo-inset",
        outline:
          "border border-transparent bg-background text-foreground shadow-neo hover:bg-card hover:shadow-neo-hover active:shadow-neo-inset",
        secondary:
          "bg-secondary text-secondary-foreground shadow-neo hover:shadow-neo-hover active:shadow-neo-inset",
        ghost:
          "bg-transparent text-foreground shadow-none hover:bg-card hover:shadow-neo active:shadow-neo-inset",
        link: "bg-transparent text-primary underline-offset-4 hover:underline shadow-none",
        success:
          "bg-success text-success-foreground shadow-neo hover:shadow-neo-hover active:shadow-neo-inset",
        warning:
          "bg-warning text-warning-foreground shadow-neo hover:shadow-neo-hover active:shadow-neo-inset",
        hero:
          "bg-gradient-primary text-white shadow-neo hover:shadow-neo-hover active:shadow-neo-inset transform transition-all duration-300 hover:-translate-y-0.5",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-2xl px-8",
        xl: "h-12 rounded-2xl px-10 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
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