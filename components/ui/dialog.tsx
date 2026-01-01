import * as React from "react"
import { X } from "lucide-react"
import { createPortal } from "react-dom"

export const DialogContext = React.createContext<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
}>({ open: false, onOpenChange: () => {} });

// Fix: Updated Dialog component props type to resolve an issue with uncontrolled usage by removing React.FC and defining props explicitly.
const Dialog = ({ open: controlledOpen, onOpenChange, children }: { open?: boolean, onOpenChange?: (open: boolean) => void, children?: React.ReactNode }) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
    const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
    const handleOpenChange = onOpenChange || setUncontrolledOpen;

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handleOpenChange(false);
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleOpenChange]);

    return (
        <DialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
            {children}
        </DialogContext.Provider>
    );
};

const DialogTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>((props, ref) => {
    const { onOpenChange } = React.useContext(DialogContext);
    const { asChild, ...buttonProps } = props;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        props.onClick?.(e);
        onOpenChange(true);
    };

    if (asChild) {
        const child = React.Children.only(props.children) as React.ReactElement;
        const handleRef = (node: HTMLButtonElement) => {
            const childRef = (child as any).ref;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;

            if (typeof childRef === 'function') childRef(node);
            else if (childRef) childRef.current = node;
        }
        return React.cloneElement(child, {
            // Fix: Spread child.props as any to avoid type errors with strict TS settings.
            ...buttonProps,
            ...(child.props as any),
            ref: handleRef,
            onClick: (e: React.MouseEvent) => {
                // Fix: Cast child.props to any to access onClick and cast event to any to handle type mismatch.
                (child.props as any)?.onClick?.(e);
                handleClick(e as any);
            },
        });
    }

    return <button ref={ref} {...buttonProps} onClick={handleClick} />;
});
DialogTrigger.displayName = "DialogTrigger";

const DialogPortal: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    const { open } = React.useContext(DialogContext);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    return open && mounted ? createPortal(children, document.body) : null;
};

const DialogOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={["fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className].filter(Boolean).join(" ")}
        {...props}
    />
));
DialogOverlay.displayName = "DialogOverlay";

const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, children, ...props }, ref) => {
    const { onOpenChange } = React.useContext(DialogContext);
    return (
        <DialogPortal>
            <DialogOverlay onClick={() => onOpenChange(false)} />
            <div
                ref={ref}
                className={["fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-card text-card-foreground p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg", className].filter(Boolean).join(" ")}
                {...props}
            >
                {children}
                <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </DialogClose>
            </div>
        </DialogPortal>
    );
});
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={["flex flex-col space-y-1.5 text-center sm:text-left", className].filter(Boolean).join(" ")} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={["flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className].filter(Boolean).join(" ")} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
    <h2 ref={ref} className={["text-lg font-semibold leading-none tracking-tight", className].filter(Boolean).join(" ")} {...props} />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
    <p ref={ref} className={["text-sm text-muted-foreground", className].filter(Boolean).join(" ")} {...props} />
));
DialogDescription.displayName = "DialogDescription";

const DialogClose = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean } >((props, ref) => {
    const { onOpenChange } = React.useContext(DialogContext);
    const { asChild, ...buttonProps } = props;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        props.onClick?.(e);
        onOpenChange(false);
    };

    if (asChild) {
        const child = React.Children.only(props.children) as React.ReactElement;
        const handleRef = (node: HTMLButtonElement) => {
            const childRef = (child as any).ref;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;

            if (typeof childRef === 'function') childRef(node);
            else if (childRef) childRef.current = node;
        }
        return React.cloneElement(child, {
            // Fix: Spread child.props as any to avoid type errors with strict TS settings.
            ...buttonProps,
            ...(child.props as any),
            ref: handleRef,
            onClick: (e: React.MouseEvent) => {
                // Fix: Cast child.props to any to access onClick and cast event to any to handle type mismatch.
                (child.props as any)?.onClick?.(e);
                handleClick(e as any);
            },
        })
    }
    return <button ref={ref} {...buttonProps} onClick={handleClick}/>;
});
DialogClose.displayName = "DialogClose";

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};