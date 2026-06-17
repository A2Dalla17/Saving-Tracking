import { type VariantProps, cva } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium select-none touch-manipulation transition-[background-color,border-color,color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2744]/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:brightness-95 motion-safe:hover:scale-[1.02]",
  {
    variants: {
      variant: {
        default:
          "bg-black text-white shadow-sm hover:bg-[#222] hover:shadow-md font-semibold",
        destructive:
          "bg-black text-white shadow-sm hover:bg-[#222] hover:shadow-md font-semibold",
        outline:
          "border-2 border-[#0f2744]/30 bg-[#f4f6f8] text-[#0f2744] shadow-sm hover:bg-[#0f2744]/8 hover:border-[#0f2744]/45",
        secondary:
          "bg-[#eef1f5] text-[#0f2744] border-2 border-[#0f2744]/20 shadow-sm hover:bg-[#e4e8ee] hover:border-[#0f2744]/35",
        ghost:
          "text-[#0f2744] hover:bg-[#0f2744]/10",
        gold:
          "bg-black text-white shadow-sm hover:bg-[#222] hover:shadow-md font-semibold",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
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
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
