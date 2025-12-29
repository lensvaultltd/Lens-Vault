import * as React from "react";

// --- START of Slot implementation ---

type Ref<T> = React.Ref<T> | undefined;
function mergeRefs<T>(refs: Ref<T>[]) {
    return (value: T) => {
        refs.forEach((ref) => {
            if (typeof ref === 'function') {
                ref(value);
            } else if (ref !== null && ref !== undefined) {
                (ref as React.MutableRefObject<T>).current = value;
            }
        });
    };
}

type AnyProps = Record<string, any>;
function mergeProps(slotProps: AnyProps, childProps: AnyProps) {
    const overrideProps = { ...childProps };
  
    for (const propName in childProps) {
      const slotPropValue = slotProps[propName];
      const childPropValue = childProps[propName];
  
      const isHandler = /^on[A-Z]/.test(propName);
      if (isHandler) {
        if (slotPropValue && childPropValue) {
          overrideProps[propName] = (...args: unknown[]) => {
            childPropValue(...args);
            slotPropValue(...args);
          };
        } else if (slotPropValue) {
          overrideProps[propName] = slotPropValue;
        }
      }
      else if (propName === 'style') {
        overrideProps[propName] = { ...slotPropValue, ...childPropValue };
      } else if (propName === 'className') {
        overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(' ');
      }
    }
  
    return { ...slotProps, ...overrideProps };
}

const Slot = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>((props, ref) => {
  const { children, ...slotProps } = props;
  const child = React.Children.only(children);

  if (!React.isValidElement(child)) {
    return null;
  }

  return React.cloneElement(child, {
    ...mergeProps(slotProps, child.props),
    ref: ref ? mergeRefs([ref, (child as any).ref]) : (child as any).ref,
  });
});
Slot.displayName = 'Slot';
// --- END of Slot implementation ---


const buttonVariants = {
  base: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  variant: {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
  },
  size: {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  },
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants.variant;
  size?: keyof typeof buttonVariants.size;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    // Fix: Refactored to use a conditional return instead of a dynamic component
    // variable (`Comp`) to resolve a TypeScript type inference issue with the `ref` prop.
    const classNames = [
      buttonVariants.base,
      buttonVariants.variant[variant],
      buttonVariants.size[size],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    if (asChild) {
      return (
        <Slot
          className={classNames}
          ref={ref}
          {...props}
        />
      );
    }

    return (
      <button
        className={classNames}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };