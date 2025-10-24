'use client'

import { Toaster } from 'react-hot-toast'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

export function Providers({ children }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          // Stile default
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
            padding: '16px',
          },
          // Stili per tipo
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </TooltipPrimitive.Provider>
  )
}
