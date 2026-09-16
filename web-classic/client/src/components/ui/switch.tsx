import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-red-600 bg-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-80 data-[state=checked]:border-emerald-800 data-[state=checked]:bg-emerald-800 data-[state=unchecked]:border-red-600 data-[state=unchecked]:bg-red-600 dark:border-red-600 dark:bg-red-600 dark:data-[state=checked]:border-emerald-700 dark:data-[state=checked]:bg-emerald-700 dark:data-[state=unchecked]:border-red-600 dark:data-[state=unchecked]:bg-red-600",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full border border-slate-300 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.32)] ring-1 ring-slate-900/15 transition-[left,right,transform] dark:border-slate-300 dark:bg-white dark:ring-white/25"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
