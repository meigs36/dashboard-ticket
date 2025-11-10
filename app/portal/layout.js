'use client'

import { CustomerAuthProvider } from '@/contexts/CustomerAuthContext'

export default function PortalLayout({ children }) {
  return (
    <CustomerAuthProvider>
      {children}
    </CustomerAuthProvider>
  )
}
