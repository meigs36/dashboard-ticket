'use client'

import * as TooltipPrimitive from '@radix-ui/react-tooltip'

export function Tooltip({ children, content, side = 'top', delayDuration = 300 }) {
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          className="z-50 overflow-hidden rounded-md bg-gray-900 dark:bg-gray-700 px-3 py-1.5 text-xs text-white shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          sideOffset={5}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-gray-900 dark:fill-gray-700" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
