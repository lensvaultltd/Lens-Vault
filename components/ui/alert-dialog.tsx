import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
  DialogContext,
} from "./dialog"
import { Button, ButtonProps } from "./button"

const AlertDialog = Dialog

const AlertDialogTrigger = DialogTrigger

const AlertDialogContent = DialogContent

const AlertDialogHeader = DialogHeader
const AlertDialogFooter = DialogFooter

const AlertDialogTitle = DialogTitle

const AlertDialogDescription = DialogDescription

const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>((props, ref) => {
    const { onOpenChange } = React.useContext(DialogContext);
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        props.onClick?.(e);
        if (!e.defaultPrevented) {
          onOpenChange(false);
        }
    };
    return <Button {...props} onClick={handleClick} ref={ref} />;
});
AlertDialogAction.displayName = "AlertDialogAction"

const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>((props, ref) => {
    const { onOpenChange } = React.useContext(DialogContext);
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        props.onClick?.(e);
        if (!e.defaultPrevented) {
          onOpenChange(false);
        }
    };
    return <Button variant="outline" {...props} onClick={handleClick} ref={ref} />;
});
AlertDialogCancel.displayName = "AlertDialogCancel"


export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}