import * as React from 'react';

const TabsContext = React.createContext({
  value: '',
  onValueChange: (value: string) => {},
});

// Fix: Add explicit prop types to handle both controlled and uncontrolled component usage.
const Tabs = ({ defaultValue, value, onValueChange, children, ...props }: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
  className?: string;
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '');
  const isControlled = value !== undefined;
  
  const contextValue = {
    value: isControlled ? value as string : internalValue,
    onValueChange: (val: string) => {
      if (!isControlled) setInternalValue(val);
      if (onValueChange) onValueChange(val);
    },
  };
  
  return <TabsContext.Provider value={contextValue}><div {...props}>{children}</div></TabsContext.Provider>;
};

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} role="tablist" className={["inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className].filter(Boolean).join(" ")} {...props} />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }>(({ className, value, ...props }, ref) => {
  const context = React.useContext(TabsContext);
  const isSelected = context.value === value;
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={isSelected}
      data-state={isSelected ? 'active' : 'inactive'}
      onClick={() => context.onValueChange(value)}
      className={["inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", isSelected ? "bg-background text-foreground shadow-sm" : "", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string }>(({ className, value, ...props }, ref) => {
  const context = React.useContext(TabsContext);
  const isSelected = context.value === value;
  return isSelected ? <div ref={ref} role="tabpanel" className={["mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className].filter(Boolean).join(" ")} {...props} /> : null;
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };