
import * as React from "react"
import { useToast } from "./use-toast"
import { X, CheckCircle2, Info, AlertTriangle, XCircle } from "lucide-react"
import { Button } from "./button"

const toastVariants = {
  base: "pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-background shadow-lg ring-1 ring-black/5 dark:ring-white/10 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-full data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:slide-in-from-right-full",
  variant: {
    default: "border",
    destructive: "group destructive border-destructive bg-destructive text-destructive-foreground",
    success: "group success border-green-500 bg-green-50 text-green-900 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200",
    info: "group info border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-200",
    warning: "group warning border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-200",
  },
}

const ICONS = {
    success: <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />,
    info: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
    destructive: <XCircle className="h-5 w-5 text-destructive-foreground" />,
}

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-0 right-0 z-[100] p-4">
      <div className="grid gap-2">
        {toasts.map(function ({ id, title, description, action, variant, ...props }) {
          const Icon = ICONS[variant as keyof typeof ICONS];
          return (
            <div
              key={id}
              className={[toastVariants.base, toastVariants.variant[variant || 'default']].filter(Boolean).join(" ")}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {Icon && <div className="flex-shrink-0 pt-0.5">{Icon}</div>}
                  <div className="flex-1">
                    {title && <p className="text-sm font-semibold">{title}</p>}
                    {description && <p className="mt-1 text-sm text-muted-foreground group-[.success]:text-green-800 group-[.info]:text-blue-800 group-[.warning]:text-yellow-800 dark:group-[.success]:text-green-300 dark:group-[.info]:text-blue-300 dark:group-[.warning]:text-yellow-300">{description}</p>}
                  </div>
                  <div className="ml-auto pl-3">
                    <Button
                      onClick={() => dismiss(id)}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-foreground/50 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 group-[.destructive]:text-destructive-foreground group-[.destructive]:hover:text-destructive-foreground/80"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </div>
                </div>
                {action}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}