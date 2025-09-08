"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Building2, User, Save, Plus, Edit, Eye, Archive } from "lucide-react"

export default function ConfiguracionPage() {
  const { data: session, update } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [businesses, setBusinesses] = useState([])
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingBusiness, setEditingBusiness] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [userData, setUserData] = useState({
    name: "",
    email: ""
  })
  const [businessFormData, setBusinessFormData] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    website: ""
  })
  
  // Verificar si el usuario es ADMIN
  const isAdmin = session?.user?.role === 'ADMIN'
  
  // Debug: Verificar información de la sesión
  console.log('Debug - Información de sesión completa:', {
    hasSession: !!session,
    userRole: session?.user?.role,
    isAdmin: isAdmin,
    userId: session?.user?.id,
    businessId: session?.user?.businessId,
    sessionComplete: session,
    userComplete: session?.user
  })

  useEffect(() => {
    if (session?.user) {
      setUserData({
        name: session.user.name || "",
        email: session.user.email || ""
      })
      
      // Cargar negocios según el rol del usuario
      loadBusinesses()
    }
  }, [session])

  // Recargar negocios cuando cambie el filtro de archivados
  useEffect(() => {
    if (session?.user && isAdmin) {
      loadBusinesses()
    }
  }, [showArchived])

  const loadBusinesses = async () => {
    setIsLoadingBusinesses(true)
    try {
      let response
      if (isAdmin) {
        // Usuarios ADMIN pueden ver todos sus negocios
        const url = showArchived ? "/api/business/list?includeArchived=true" : "/api/business/list"
        response = await fetch(url)
      } else {
        // Usuarios normales solo ven su negocio asociado
        response = await fetch("/api/business/get")
      }
      
      const data = await response.json()
      
      if (response.ok) {
        if (isAdmin) {
          setBusinesses(data.businesses || [])
        } else {
          // Para usuarios normales, convertir el negocio único en array
          setBusinesses(data.hasBusiness && data.business ? [data.business] : [])
        }
      } else {
        console.error("Error loading businesses:", data.error)
        setBusinesses([])
      }
    } catch (error) {
      console.error("Error loading businesses:", error)
      setBusinesses([])
    } finally {
      setIsLoadingBusinesses(false)
    }
  }

  const handleUserChange = (e) => {
    setUserData({
      ...userData,
      [e.target.name]: e.target.value
    })
  }

  const handleBusinessFormChange = (e) => {
    setBusinessFormData({
      ...businessFormData,
      [e.target.name]: e.target.value
    })
  }

  const resetBusinessForm = () => {
    setBusinessFormData({
      name: "",
      description: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      whatsapp: ""
    })
    setEditingBusiness(null)
    setShowCreateForm(false)
  }

  const handleCreateBusiness = () => {
    resetBusinessForm()
    setShowCreateForm(true)
  }

  const handleEditBusiness = (business) => {
    setBusinessFormData({
      name: business.name || "",
      description: business.description || "",
      address: business.address || "",
      phone: business.phone || "",
      email: business.email || "",
      website: business.website || "",
      whatsapp: business.whatsapp || ""
    })
    setEditingBusiness(business)
    setShowCreateForm(true)
  }



  const handleArchiveBusiness = async (businessId, businessName, isArchived = false) => {
    const action = isArchived ? "desarchivar" : "archivar"
    const message = isArchived 
      ? `¿Estás seguro de que deseas desarchivar el negocio "${businessName}"?`
      : `¿Estás seguro de que deseas archivar el negocio "${businessName}"? Podrás reactivarlo más tarde.`
    
    if (!confirm(message)) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/business/${businessId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ archived: !isArchived }),
      })

      if (response.ok) {
        toast.success(`Negocio ${action}do exitosamente`)
        await loadBusinesses()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || `Error al ${action} el negocio`)
      }
    } catch (error) {
      console.error(`Error ${action}ing business:`, error)
      toast.error(`Error al ${action} el negocio`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveUser = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/user/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      })

      if (response.ok) {
        toast.success("Información personal actualizada")
        // Actualizar la sesión
        await update()
      } else {
        toast.error("Error al actualizar la información personal")
      }
    } catch (error) {
      toast.error("Error al actualizar la información personal")
    } finally {
      setIsLoading(false)
    }
  }

  const processWebsiteUrl = (url) => {
    if (!url || url.trim() === '') return ''
    
    const trimmedUrl = url.trim()
    
    // Si ya tiene protocolo, devolverlo tal como está
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      return trimmedUrl
    }
    
    // Si no tiene protocolo, agregar https://
    return `https://${trimmedUrl}`
  }

  const handleSaveBusinessForm = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      let endpoint, method
      
      if (editingBusiness) {
        // Actualizar negocio existente
        endpoint = `/api/business/${editingBusiness.id}`
        method = "PUT"
      } else {
        // Crear nuevo negocio
        endpoint = "/api/business/create"
        method = "POST"
      }
      
      // Procesar la URL del sitio web antes de enviar
      const processedBusinessData = {
        ...businessFormData,
        website: processWebsiteUrl(businessFormData.website)
      }
      
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(processedBusinessData),
      })

      if (response.ok) {
        const message = editingBusiness ? "Negocio actualizado exitosamente" : "Negocio creado exitosamente"
        toast.success(message)
        
        // Recargar la lista de negocios
        await loadBusinesses()
        
        // Resetear el formulario
        resetBusinessForm()
        
        // Actualizar la sesión
        await update()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Error al procesar la información del negocio")
      }
    } catch (error) {
      console.error("Error saving business:", error)
      toast.error("Error al procesar la información del negocio")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600 mt-1">
            {isAdmin ? "Gestiona la información de tu cuenta y múltiples negocios" : "Gestiona la información de tu cuenta y negocio"}
          </p>
        </div>
      </div>

      {/* Información Personal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Información Personal</span>
          </CardTitle>
          <CardDescription>
            Actualiza tu información personal y de contacto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userName">Nombre Completo</Label>
                <Input
                  id="userName"
                  name="name"
                  type="text"
                  value={userData.name}
                  onChange={handleUserChange}
                  disabled={isLoading}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="userEmail">Correo Electrónico</Label>
                <Input
                  id="userEmail"
                  name="email"
                  type="email"
                  value={userData.email}
                  onChange={handleUserChange}
                  disabled={isLoading}
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Gestión de Negocios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>{isAdmin ? "Gestión de Negocios" : "Información del Negocio"}</span>
            </div>
            <div className="flex items-center space-x-2">
              {isAdmin && (
                <Button onClick={handleCreateBusiness} disabled={isLoading || showCreateForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Negocio
                </Button>
              )}
              
            </div>
          </CardTitle>
          <CardDescription>
            {isLoadingBusinesses ? "Cargando negocios..." :
             isAdmin ? "Gestiona todos tus negocios desde aquí" :
             businesses.length > 0 ? "Configura los datos básicos de tu negocio" :
             "Crea tu negocio para comenzar a gestionar tu información empresarial"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Loading State */}
          {isLoadingBusinesses && (
            <div className="flex justify-center py-8">
              <div className="text-gray-500">Cargando negocios...</div>
            </div>
          )}

          {/* Lista de Negocios */}
          {!isLoadingBusinesses && businesses.length > 0 && !showCreateForm && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {isAdmin ? `Mis Negocios (${businesses.length})` : "Mi Negocio"}
                </h3>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowArchived(!showArchived)}
                    className="text-xs"
                  >
                    {showArchived ? "Ocultar archivados" : "Mostrar archivados"}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {businesses.map((business) => (
                  <Card key={business.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900 truncate">{business.name}</h4>
                            {business.archived && (
                              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                                Archivado
                              </span>
                            )}
                          </div>
                          {business.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{business.description}</p>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-xs text-gray-500">
                          {business.email && (
                            <p className="truncate">📧 {business.email}</p>
                          )}
                          {business.phone && (
                            <p className="truncate">📞 {business.phone}</p>
                          )}
                          {business.whatsapp && (
                            <p className="truncate">💬 {business.whatsapp}</p>
                          )}
                          {business.address && (
                            <p className="truncate">📍 {business.address}</p>
                          )}
                          {business.website && (
                            <p className="truncate">🌐 {business.website}</p>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-400">
                            Creado: {new Date(business.createdAt).toLocaleDateString('es-ES')}
                          </span>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditBusiness(business)}
                              disabled={isLoading}
                              className="h-8 w-8 p-0"
                              title="Editar negocio"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            {isAdmin && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleArchiveBusiness(business.id, business.name, business.archived)}
                                  disabled={isLoading}
                                  className={`h-8 w-8 p-0 ${
                                    business.archived 
                                      ? "text-green-600 hover:text-green-700 hover:bg-green-50" 
                                      : "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                  }`}
                                  title={business.archived ? "Desarchivar negocio" : "Archivar negocio"}
                                >
                                  <Archive className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Estado vacío */}
          {!isLoadingBusinesses && businesses.length === 0 && !showCreateForm && (
            <div className="text-center py-12 space-y-4">
              <div className="text-gray-600">
                <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">No tienes negocios asociados</p>
                <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                  {isAdmin ? "Crea tu primer negocio para comenzar a gestionar tu información empresarial." :
                   "Solicita a un administrador que te asocie a un negocio o crea uno nuevo."}
                </p>
              </div>
              {isAdmin && (
                <Button onClick={handleCreateBusiness} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Mi Primer Negocio
                </Button>
              )}
            </div>
          )}

          {/* Formulario de Crear/Editar Negocio */}
          {showCreateForm && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingBusiness ? "Editar Negocio" : "Crear Nuevo Negocio"}
                </h3>
                <Button
                  variant="outline"
                  onClick={resetBusinessForm}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </div>
              
              <form onSubmit={handleSaveBusinessForm} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Nombre del Negocio *</Label>
                    <Input
                      id="businessName"
                      name="name"
                      type="text"
                      value={businessFormData.name}
                      onChange={handleBusinessFormChange}
                      disabled={isLoading}
                      required
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="businessEmail">Correo del Negocio</Label>
                    <Input
                      id="businessEmail"
                      name="email"
                      type="email"
                      value={businessFormData.email}
                      onChange={handleBusinessFormChange}
                      disabled={isLoading}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="businessPhone">Teléfono</Label>
                    <Input
                      id="businessPhone"
                      name="phone"
                      type="tel"
                      value={businessFormData.phone}
                      onChange={handleBusinessFormChange}
                      disabled={isLoading}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="businessWhatsapp">WhatsApp</Label>
                    <Input
                      id="businessWhatsapp"
                      name="whatsapp"
                      type="tel"
                      value={businessFormData.whatsapp}
                      onChange={handleBusinessFormChange}
                      disabled={isLoading}
                      placeholder="+57 300 123 4567"
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="businessWebsite">Sitio Web</Label>
                    <Input
                      id="businessWebsite"
                      name="website"
                      type="url"
                      value={businessFormData.website}
                      onChange={handleBusinessFormChange}
                      disabled={isLoading}
                      placeholder="ejemplo.com"
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="businessAddress">Dirección</Label>
                  <Input
                    id="businessAddress"
                    name="address"
                    type="text"
                    value={businessFormData.address}
                    onChange={handleBusinessFormChange}
                    disabled={isLoading}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="businessDescription">Descripción</Label>
                  <Input
                    id="businessDescription"
                    name="description"
                    type="text"
                    value={businessFormData.description}
                    onChange={handleBusinessFormChange}
                    disabled={isLoading}
                    placeholder="Breve descripción de tu negocio"
                    className="w-full"
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetBusinessForm}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? "Guardando..." : editingBusiness ? "Actualizar Negocio" : "Crear Negocio"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}