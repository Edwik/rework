"use client"

import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugSessionPage() {
  const { data: session, status } = useSession()
  
  const isAdmin = session?.user?.role === 'ADMIN'
  
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Debug - Información de Sesión</CardTitle>
          <CardDescription>Información detallada de la sesión actual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>Status:</strong> {status}
          </div>
          
          <div>
            <strong>¿Tiene sesión?:</strong> {session ? 'Sí' : 'No'}
          </div>
          
          {session && (
            <>
              <div>
                <strong>ID de usuario:</strong> {session.user?.id || 'No disponible'}
              </div>
              
              <div>
                <strong>Nombre:</strong> {session.user?.name || 'No disponible'}
              </div>
              
              <div>
                <strong>Email:</strong> {session.user?.email || 'No disponible'}
              </div>
              
              <div>
                <strong>Rol:</strong> {session.user?.role || 'No disponible'}
              </div>
              
              <div>
                <strong>¿Es Admin?:</strong> {isAdmin ? 'Sí' : 'No'}
              </div>
              
              <div>
                <strong>Business ID:</strong> {session.user?.businessId || 'No disponible'}
              </div>
              
              <div>
                <strong>Información completa de la sesión:</strong>
                <pre className="bg-gray-100 p-4 rounded mt-2 text-sm overflow-auto">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}