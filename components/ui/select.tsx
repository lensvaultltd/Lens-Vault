import React, { useState, useContext, createContext, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

// Fix: Complete implementation of a custom Select component and export all necessary parts.
const SelectContext = createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
    value: string | undefined;
    onValueChange: (value: string) => void;
    triggerRef: React.RefObject<HTMLButtonElement>;
    contentRef: React.RefObject<HTMLDivElement>;
    items: Map<string, React.ReactNode>;
    registerItem: (value: string, node: React.ReactNode) => void;
    unregisterItem: (value: string) => void;
}>({
    open: false,
    setOpen: () => {},
    value: undefined,
    onValueChange: () => {},
    triggerRef: React.createRef<HTMLButtonElement>(),
    contentRef: React.createRef<HTMLDivElement>(),
    items: new Map(),
    registerItem: () => {},
    unregisterItem: () => {},
});

const Select = ({ children, value, onValueChange, defaultValue }: { children?: React.ReactNode; value?: string; onValueChange?: (value: string) => void; defaultValue?: string; }) => {
    const [open, setOpen] = useState(false);
    const [internalValue, setInternalValue] = useState(defaultValue);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [items, setItems] = useState(new Map<string, React.ReactNode>());

    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;

    const handleValueChange = (val: string) => {
        if (!isControlled) setInternalValue(val);
        onValueChange?.(val);
        setOpen(false);
    };

    const registerItem = React.useCallback((itemValue: string, node: React.ReactNode) => {
        setItems(prev => new Map(prev).set(itemValue, node));
    }, []);

    const unregisterItem = React.useCallback((itemValue: string) => {
        setItems(prev => {
            const newItems = new Map(prev);
            newItems.delete(itemValue);
            return newItems;
        });
    }, []);

    return (
        <SelectContext.Provider value={{ open, setOpen, value: currentValue, onValueChange: handleValueChange, triggerRef, contentRef, items, registerItem, unregisterItem }}>
            <div className="relative">{children}</div>
        </SelectContext.Provider>
    );
};
Select.displayName = "Select";

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ children, className, ...props }, ref) => {
    const { open, setOpen, triggerRef } = useContext(SelectContext);
    
    const handleRef = (node: HTMLButtonElement | null) => {
        if (triggerRef) triggerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
    }

    return (
        <button
            ref={handleRef}
            type="button"
            onClick={() => setOpen(!open)}
            className={["flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className].filter(Boolean).join(" ")}
            data-state={open ? 'open' : 'closed'}
            {...props}
        >
            {children}
            <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
    );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = ({ placeholder }: { placeholder?: React.ReactNode }) => {
    const { value, items } = useContext(SelectContext);
    
    const displayValue = value ? items.get(value) : null;
    
    if (!value || !displayValue) {
        return <>{placeholder}</>;
    }
    
    return <>{displayValue}</>;
};
SelectValue.displayName = "SelectValue";

const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ children, className, ...props }, ref) => {
    const { open, setOpen, triggerRef, contentRef } = useContext(SelectContext);
    const [style, setStyle] = useState({});

    const handleRef = (node: HTMLDivElement | null) => {
        if (contentRef) contentRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
    }

    useEffect(() => {
        if (open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
             setStyle({
                position: 'fixed',
                top: `${rect.bottom + 4}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
            });
        }
    }, [open, triggerRef]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contentRef.current && !contentRef.current.contains(event.target as Node) && triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open, setOpen, triggerRef, contentRef]);

    if (!open) return null;
    
    return createPortal(
        <div
            ref={handleRef}
            style={style}
            className={["z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95", className].filter(Boolean).join(" ")}
            {...props}
        >
            {children}
        </div>,
        document.body
    );
});
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string }>((
    { className, children, value, ...props }, ref
) => {
    const { onValueChange, value: contextValue, registerItem, unregisterItem } = useContext(SelectContext);
    const isSelected = contextValue === value;

    useEffect(() => {
        if (value) {
            registerItem(value, children);
        }
        return () => {
            if (value) {
                unregisterItem(value);
            }
        };
    }, [value, children, registerItem, unregisterItem]);

    return (
        <div
            ref={ref}
            className={["relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className].filter(Boolean).join(" ")}
            onClick={() => onValueChange(value)}
            {...props}
        >
            {isSelected && (
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <Check className="h-4 w-4" />
                </span>
            )}
            {children}
        </div>
    );
});
SelectItem.displayName = "SelectItem";

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
