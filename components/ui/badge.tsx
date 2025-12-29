
import * as React from "react"

const badgeVariants = {
    base: "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    variant: {
        default: "border-transparent bg-primary-accent text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
    },
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof badgeVariants.variant;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({ className, variant = 'default', ...props }, ref) => (
    <div
        ref={ref}
        className={[badgeVariants.base, badgeVariants.variant[variant], className].filter(Boolean).join(" ")}
        {...props}
    />
));
Badge.displayName = "Badge";

export { Badge }