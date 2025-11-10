'use client'

import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  FileText, 
  Wrench,
  LogOut,
  Building2
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({ children }) {
  const { customerProfile, signOut, loading } = useCustomerAuth()
  const router = useRouter()
  const pathname = usePathname()

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/portal/dashboard',
      icon: LayoutDashboard
    },
    {
      name: 'Azienda',
      href: '/portal/dashboard/azienda',
      icon: Building2
    },
    {
      name: 'Referenti',
      href: '/portal/dashboard/referenti',
      icon: Users
    },
    {
      name: 'Macchinari',
      href: '/portal/dashboard/macchinari',
      icon: Wrench
    },
    {
      name: 'Documenti',
      href: '/portal/dashboard/documenti',
      icon: FileText
    },
    {
      name: 'Impostazioni',
      href: '/portal/dashboard/impostazioni',
      icon: Settings
    }
  ]

  async function handleLogout() {
    await signOut()
    router.push('/portal')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {customerProfile?.ragione_sociale || 'Portale Cliente'}
                </h1>
                <p className="text-sm text-gray-500">
                  {customerProfile?.email}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Esci</span>
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)] sticky top-[73px]">
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer Sidebar */}
          <div className="absolute bottom-4 left-4 right-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs font-medium text-blue-900 mb-1">
              Serve aiuto?
            </p>
            <p className="text-xs text-blue-700 mb-2">
              Contatta il supporto OdontoService
            </p>
            <a
              href="mailto:assistenza@odontoservice.it"
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              assistenza@odontoservice.it
            </a>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
