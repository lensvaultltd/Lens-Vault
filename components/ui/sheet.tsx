import * as React from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogClose, DialogTitle, DialogHeader } from './dialog';
import { X } from 'lucide-react';

const Sheet = Dialog;
const SheetTrigger = DialogTrigger;
const SheetHeader = DialogHeader;
const SheetTitle = DialogTitle;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  React.ComponentPropsWithoutRef<typeof DialogContent> & { side?: 'top' | 'bottom' | 'left' | 'right' }
>(({ side = 'right', className, children, ...props }, ref) => (
  <DialogContent
    ref={ref}
    className={[
      "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
      "max-w-full w-full h-full sm:max-w-lg sm:w-auto sm:h-auto sm:rounded-lg",
      side === 'top' && "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
      side === 'bottom' && "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
      side === 'left' && "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
      side === 'right' && "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      className
    ].filter(Boolean).join(' ')}
    {...props}
  >
    {children}
    <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </DialogClose>
  </DialogContent>
));
SheetContent.displayName = 'SheetContent';

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle };