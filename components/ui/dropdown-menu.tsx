import React, { useState, useContext, createContext, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const DropdownMenuContext = createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
    triggerRef: React.RefObject<HTMLElement>;
}>({
    open: false,
    setOpen: () => {},
    triggerRef: React.createRef<HTMLElement>(),
});

// Fix: Added explicit prop types to handle children.
const DropdownMenu = ({ children }: { children?: React.ReactNode }) => {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    return (
        <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
            <div className="relative inline-block text-left">{children}</div>
        </DropdownMenuContext.Provider>
    );
};

// Fix: Added explicit prop types to handle children and asChild.
const DropdownMenuTrigger = ({ children, asChild }: { children?: React.ReactNode, asChild?: boolean }) => {
    const { open, setOpen, triggerRef } = useContext(DropdownMenuContext);
    const child = React.Children.only(children) as React.ReactElement<any>;
    
    const childRef = (child as any).ref;
    const handleRef = (node: HTMLElement) => {
        triggerRef.current = node;
        if (typeof childRef === 'function') childRef(node);
        else if (childRef) childRef.current = node;
    }

    return React.cloneElement(child, {
        ...child.props,
        ref: handleRef,
        onClick: (e: React.MouseEvent) => {
            child.props.onClick?.(e);
            setOpen(!open);
        },
        'aria-haspopup': 'menu',
        'aria-expanded': open,
    });
};

const DropdownMenuContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { align?: 'start' | 'center' | 'end', sideOffset?: number }>(({ children, className, align = 'end', sideOffset = 4, ...props }, ref) => {
    const { open, setOpen, triggerRef } = useContext(DropdownMenuContext);
    const menuRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = React.useState({});

    useEffect(() => {
        if (open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
             setStyle({
                position: 'fixed',
                top: `${rect.bottom + sideOffset}px`,
                left: align === 'end' ? `${rect.right}px` : `${rect.left}px`,
                transform: align === 'end' ? 'translateX(-100%)' : 'translateX(0)',
            });
        }
    }, [open, triggerRef, sideOffset, align]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target) && triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open, setOpen, triggerRef]);

    if (!open) return null;
    
    return createPortal(
        <div
            ref={node => {
                if (typeof ref === 'function') ref(node);
                else if (ref) ref.current = node;
                menuRef.current = node;
            }}
            style={style}
            className={["z-[999] min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95", className].filter(Boolean).join(" ")}
            {...props}
        >
            {children}
        </div>,
        document.body
    );
});


const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { onSelect?: (event: Event) => void }>(({ children, className, onSelect, ...props }, ref) => {
    const { setOpen } = useContext(DropdownMenuContext);
    return (
        <div
            ref={ref}
            className={["relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className].filter(Boolean).join(" ")}
            onClick={(e) => {
                props.onClick?.(e);
                onSelect?.(e as any);
                if(!e.defaultPrevented) setOpen(false);
            }}
            {...props}
        >
            {children}
        </div>
    );
});

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={["-mx-1 my-1 h-px bg-muted", className].filter(Boolean).join(" ")} {...props} />
));

const DropdownMenuPortal = ({ children }) => <>{children}</>;
const DropdownMenuSub = ({ children }) => <div className="relative">{children}</div>;
const DropdownMenuSubTrigger = ({ children }) => <div>{children}</div>;
const DropdownMenuSubContent = ({ children }) => <div className="absolute left-full top-0">{children}</div>;

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent };