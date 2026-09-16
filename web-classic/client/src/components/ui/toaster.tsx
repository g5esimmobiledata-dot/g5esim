import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useLocation } from "wouter"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()
  const [location] = useLocation()
  const isAdminRoute = location.startsWith("/admin")

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, className, variant, ...props }) {
        return (
          <Toast
            key={id}
            variant={variant}
            className={cn(
              isAdminRoute &&
                (variant === "destructive"
                  ? "border-red-900/70 bg-red-950 text-red-100"
                  : "border-slate-700 bg-slate-900 text-white"),
              className,
            )}
            {...props}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
