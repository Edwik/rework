"use client"

import { useState, useEffect } from "react"
import { SessionProvider, useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Logo } from "@/components/ui/logo"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Menu, 
  Settings, 
  LogOut, 
  User,
  Building2
} from "lucide-react"
import "./globals.css"

// Navegación global
const navigation = [
  {
    name: "Configuración",
    href: "/configuracion",
    icon: Settings
  }
]

// Componente del Drawer Global
function GlobalDrawer({ children }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState('')
  const [userBusinesses, setUserBusinesses] = useState([])
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(false)

  // Páginas donde NO se debe mostrar el drawer
  const excludedPages = ['/login', '/register']
  const shouldShowDrawer = !excludedPages.includes(pathname) && session

  // Cargar negocios y negocio seleccionado
  useEffect(() => {
    if (session?.user) {
      loadBusinesses()
      loadSelectedBusiness()
    }
  }, [session])

  const loadBusinesses = async () => {
    setIsLoadingBusinesses(true)
    try {
      let response
      if (session?.user?.role === 'ADMIN') {
        // Usuarios ADMIN pueden ver todos sus negocios
        response = await fetch('/api/business/list')
      } else {
        // Usuarios normales solo ven su negocio asociado
        response = await fetch('/api/business/get')
      }
      
      const data = await response.json()
      
      if (response.ok) {
        if (session?.user?.role === 'ADMIN') {
          setUserBusinesses(data.businesses || [])
        } else {
          // Para usuarios normales, convertir el negocio único en array
          setUserBusinesses(data.hasBusiness && data.business ? [data.business] : [])
        }
      } else {
        console.error('Error loading businesses:', data.error)
        setUserBusinesses([])
      }
    } catch (error) {
      console.error('Error loading businesses:', error)
      setUserBusinesses([])
    } finally {
      setIsLoadingBusinesses(false)
    }
  }

  const loadSelectedBusiness = async () => {
    try {
      const response = await fetch('/api/business/select')
      const data = await response.json()
      
      if (response.ok && data.selectedBusiness) {
        setSelectedBusiness(data.selectedBusiness.id)
      }
    } catch (error) {
      console.error('Error loading selected business:', error)
    }
  }

  const handleBusinessChange = async (businessId) => {
    try {
      const response = await fetch('/api/business/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessId }),
      })
      
      if (response.ok) {
        setSelectedBusiness(businessId)
        // Opcional: mostrar notificación de éxito
        console.log('Negocio seleccionado correctamente')
      } else {
        const data = await response.json()
        console.error('Error selecting business:', data.error)
      }
    } catch (error) {
      console.error('Error selecting business:', error)
    }
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" })
  }

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col h-full ${mobile ? 'w-full' : 'w-64'} bg-white border-r border-gray-200`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 space-y-4">
        {/* Logo y título */}
        <div className="flex flex-col items-center space-y-3">
          <Logo className="h-12 w-auto" showText={false} />
          <div className="text-center">
            <p className="text-sm text-gray-500 -mt-4">Gestión Empresarial</p>
          </div>
        </div>
        
        {/* Selector de negocio */}
        <div className="space-y-2">
          <Select value={selectedBusiness} onValueChange={handleBusinessChange} disabled={isLoadingBusinesses}>
            <SelectTrigger className="w-full bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors">
              <SelectValue placeholder={isLoadingBusinesses ? "Cargando..." : "Seleccionar negocio"} />
            </SelectTrigger>
            <SelectContent>
              {userBusinesses.map((business) => (
                <SelectItem key={business.id} value={business.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{business.name}</span>
                    {business.isSelected && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                        Actual
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
              onClick={() => mobile && setSidebarOpen(false)}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 mb-3">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {session?.user?.name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {session?.user?.email}
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )

  // Si no debe mostrar el drawer, solo renderizar children
  if (!shouldShowDrawer) {
    return children
  }

  // Layout con drawer
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar mobile />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          </Sheet>
          
          <div className="flex items-center space-x-2">
            <Logo className="h-6 w-auto" showText={true} />
          </div>
          
          <div className="w-8" /> {/* Spacer for centering */}
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="antialiased">
        <SessionProvider>
          <GlobalDrawer>
            {children}
          </GlobalDrawer>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  )
}
