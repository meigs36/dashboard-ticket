'use client';
import { CustomerAuthProvider } from '@/contexts/CustomerAuthContext';

// Layout MINIMALISTA - solo Provider, ZERO logica
export default function PortalLayout({ children }) {
  return (
    <CustomerAuthProvider>
      {children}
    </CustomerAuthProvider>
  );
}
