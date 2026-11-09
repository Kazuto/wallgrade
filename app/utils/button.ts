import { tv, type VariantProps } from "tailwind-variants";

/** Classes for anything that looks like a button, links included. */
export const buttonClass = tv({
  base: "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50",
  variants: {
    variant: {
      primary: "bg-accent text-on-accent hover:bg-accent-hover",
      secondary:
        "border border-line bg-panel text-fg hover:border-line-strong hover:bg-raised",
      ghost: "text-muted hover:bg-raised hover:text-fg",
    },
    size: {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-11 px-5 text-[15px]",
      icon: "size-9",
    },
  },
  defaultVariants: {
    variant: "secondary",
    size: "md",
  },
});

export type ButtonVariants = VariantProps<typeof buttonClass>;
