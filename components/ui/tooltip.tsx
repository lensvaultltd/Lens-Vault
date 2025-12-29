
import * as React from "react"
import { createPortal } from "react-dom"

const TooltipContext = React.createContext({
    open: false,
    setOpen: (open: boolean) => {},
    triggerRef: React.createRef<HTMLElement>(),
});

// Fix: Added explicit prop types and made children optional.
const TooltipProvider = ({ children }: { children?: React.ReactNode }) => {
    return <>{children}</>;
};

// Fix: Added explicit prop types and made children optional.
const Tooltip = ({ children, open: controlledOpen, onOpenChange }: { children?: React.ReactNode, open?: boolean, onOpenChange?: (open: boolean) => void }) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
    const triggerRef = React.useRef(null);
    const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
    const setOpen = onOpenChange || setUncontrolledOpen;

    return (
        <TooltipContext.Provider value={{ open, setOpen, triggerRef }}>
            {children}
        </TooltipContext.Provider>
    );
};

// Fix: Added `asChild` to TooltipTrigger props to fix type error when used with `asChild`.
const TooltipTrigger = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement> & { asChild?: boolean }>(({ children, asChild, ...props }, ref) => {
    const { setOpen, triggerRef } = React.useContext(TooltipContext);
    const child = React.Children.only(children) as React.ReactElement<any>;

    const handleRef = (node: HTMLElement) => {
        triggerRef.current = node;
        const childRef = (child as any).ref;
        if (typeof childRef === 'function') {
            childRef(node);
        } else if (childRef) {
            childRef.current = node;
        }
        if (typeof ref === 'function') {
            ref(node);
        } else if (ref) {
            (ref as React.MutableRefObject<HTMLElement>).current = node;
        }
    };
    
    return React.cloneElement(child, {
        ...props,
        ...child.props,
        ref: handleRef,
        onMouseEnter: (e: React.MouseEvent) => {
            child.props.onMouseEnter?.(e);
            setOpen(true);
        },
        onMouseLeave: (e: React.MouseEvent) => {
            child.props.onMouseLeave?.(e);
            setOpen(false);
        },
        onFocus: (e: React.FocusEvent) => {
            child.props.onFocus?.(e);
            setOpen(true);
        },
        onBlur: (e: React.FocusEvent) => {
            child.props.onBlur?.(e);
            setOpen(false);
        },
    });
});
TooltipTrigger.displayName = 'TooltipTrigger';

const TooltipContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { sideOffset?: number }>(({ className, sideOffset = 4, ...props }, ref) => {
    const { open, triggerRef } = React.useContext(TooltipContext);
    const [style, setStyle] = React.useState({});

    React.useEffect(() => {
        if (open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setStyle({
                position: 'fixed',
                top: `${rect.bottom + sideOffset}px`,
                left: `${rect.left + rect.width / 2}px`,
                transform: 'translateX(-50%)',
            });
        }
    }, [open, triggerRef, sideOffset]);

    if (!open) return null;

    return createPortal(
        <div
            ref={ref}
            style={style}
            className={["z-[999] overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95", className].filter(Boolean).join(" ")}
            {...props}
        />,
        document.body
    );
});
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
