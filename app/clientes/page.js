"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Building2,
  Loader2,
  Users
} from 'lucide-react'

/**
 * Página principal de gestión de clientes
 * Incluye listado con infinite scroll, búsqueda, filtros y CRUD completo
 * Diseño 100% responsive para móvil
 */
export default function ClientesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Estados principales
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedBusiness, setSelectedBusiness] = useState('all')
  const [businesses, setBusinesses] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    document: '',
    documentType: '',
    notes: '',
    businessId: ''
  })
  const [formLoading, setFormLoading] = useState(false)

  // Redireccionar si no está autenticado
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Cargar negocios disponibles (solo para admin)
  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      loadBusinesses()
    }
  }, [session])

  // Cargar clientes inicial
  useEffect(() => {
    if (session) {
      loadClients(true)
    }
  }, [session, search, selectedBusiness])

  /**
   * Cargar lista de negocios (solo para admin)
   */
  const loadBusinesses = async () => {
    try {
      const response = await fetch('/api/business/list')
      const data = await response.json()
      
      if (response.ok) {
        setBusinesses(data.businesses || [])
      } else {
        console.error('Error loading businesses:', data.error)
      }
    } catch (error) {
      console.error('Error loading businesses:', error)
    }
  }

  /**
   * Cargar clientes con paginación
   */
  const loadClients = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true)
        setPage(1)
      } else {
        setLoadingMore(true)
      }

      const currentPage = reset ? 1 : page
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      })

      if (search.trim()) {
        params.append('search', search.trim())
      }

      if (selectedBusiness && selectedBusiness !== 'all') {
        params.append('businessId', selectedBusiness)
      }

      const response = await fetch(`/api/clients?${params}`)
      const data = await response.json()

      if (response.ok) {
        if (reset) {
          setClients(data.clients)
        } else {
          setClients(prev => [...prev, ...data.clients])
        }
        
        setHasMore(data.pagination.hasNext)
        setPage(currentPage + 1)
      } else {
        toast.error(data.error || 'Error al cargar clientes')
      }
    } catch (error) {
      console.error('Error loading clients:', error)
      toast.error('Error al cargar clientes')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  /**
   * Cargar más clientes (infinite scroll)
   */
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadClients(false)
    }
  }, [loadingMore, hasMore, page])

  /**
   * Manejar scroll infinito
   */
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 1000
      ) {
        loadMore()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadMore])

  /**
   * Manejar búsqueda con debounce
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (session) {
        loadClients(true)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  /**
   * Resetear formulario
   */
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      document: '',
      documentType: '',
      notes: '',
      businessId: ''
    })
    setEditingClient(null)
  }

  /**
   * Abrir modal de creación
   */
  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  /**
   * Abrir modal de edición
   */
  const openEditModal = (client) => {
    setFormData({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      document: client.document || '',
      documentType: client.documentType || '',
      notes: client.notes || '',
      businessId: client.businessId || ''
    })
    setEditingClient(client)
    setShowCreateModal(true)
  }

  /**
   * Cerrar modal
   */
  const closeModal = () => {
    setShowCreateModal(false)
    resetForm()
  }

  /**
   * Manejar envío del formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    setFormLoading(true)

    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients'
      const method = editingClient ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(editingClient ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente')
        closeModal()
        loadClients(true) // Recargar lista
      } else {
        toast.error(data.error || 'Error al guardar cliente')
      }
    } catch (error) {
      console.error('Error saving client:', error)
      toast.error('Error al guardar cliente')
    } finally {
      setFormLoading(false)
    }
  }

  /**
   * Eliminar cliente
   */
  const handleDelete = async (client) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el cliente "${client.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Cliente eliminado correctamente')
        loadClients(true) // Recargar lista
      } else {
        toast.error(data.error || 'Error al eliminar cliente')
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      toast.error('Error al eliminar cliente')
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
              <p className="text-sm text-gray-500">
                Gestiona los clientes de tu negocio
              </p>
            </div>
          </div>
          
          <Button onClick={openCreateModal} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, email, teléfono o documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filtro por negocio (solo para admin) */}
          {session?.user?.role === 'ADMIN' && (
            <div className="w-full sm:w-64">
              <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los negocios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los negocios</SelectItem>
                  {businesses.map((business) => (
                    <SelectItem key={business.id} value={business.id}>
                      {business.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Lista de clientes */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay clientes
              </h3>
              <p className="text-gray-500 mb-4">
                {search ? 'No se encontraron clientes con los criterios de búsqueda.' : 'Comienza agregando tu primer cliente.'}
              </p>
              {!search && (
                <Button onClick={openCreateModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer cliente
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Tabla de clientes */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Contacto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Documento
                    </th>
                    {session?.user?.role === 'ADMIN' && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Negocio
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      {/* Cliente */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">
                            {client.name}
                          </div>
                          {client.address && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              <MapPin className="h-3 w-3 inline mr-1" />
                              {client.address}
                            </div>
                          )}
                          {/* Mostrar contacto en móvil */}
                          <div className="sm:hidden mt-1 space-y-1">
                            {client.email && (
                              <div className="text-xs text-gray-500 flex items-center">
                                <Mail className="h-3 w-3 mr-1" />
                                {client.email}
                              </div>
                            )}
                            {client.phone && (
                              <div className="text-xs text-gray-500 flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {client.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      {/* Contacto */}
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <div className="space-y-1">
                          {client.email && (
                            <div className="text-sm text-gray-900 flex items-center">
                              <Mail className="h-3 w-3 mr-1 text-gray-400" />
                              <span className="truncate max-w-xs">{client.email}</span>
                            </div>
                          )}
                          {client.phone && (
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="h-3 w-3 mr-1 text-gray-400" />
                              {client.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {/* Documento */}
                      <td className="px-4 py-4 hidden md:table-cell">
                        {client.document && (
                          <div className="text-sm text-gray-900">
                            <div className="flex items-center">
                              <FileText className="h-3 w-3 mr-1 text-gray-400" />
                              <span className="font-medium">{client.documentType || 'DOC'}</span>
                            </div>
                            <div className="text-xs text-gray-500">{client.document}</div>
                          </div>
                        )}
                      </td>
                      
                      {/* Negocio */}
                      {session?.user?.role === 'ADMIN' && (
                        <td className="px-4 py-4 hidden lg:table-cell">
                          {client.business && (
                            <div className="text-sm text-gray-900 flex items-center">
                              <Building2 className="h-3 w-3 mr-1 text-gray-400" />
                              <span className="truncate max-w-xs">{client.business.name}</span>
                            </div>
                          )}
                        </td>
                      )}
                      
                      {/* Fecha */}
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <div className="text-sm text-gray-500">
                          {new Date(client.createdAt).toLocaleDateString('es-CO', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </td>
                      
                      {/* Acciones */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(client)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(client)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Loading más elementos */}
          {loadingMore && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-sm text-gray-500">Cargando más clientes...</span>
            </div>
          )}
          
          {/* Mensaje de fin */}
          {!hasMore && clients.length > 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">
                Has visto todos los clientes ({clients.length} total{clients.length !== 1 ? 'es' : ''})
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal de creación/edición */}
      {showCreateModal && (
        <ClientModal
          client={editingClient}
          formData={formData}
          setFormData={setFormData}
          businesses={businesses}
          onSubmit={handleSubmit}
          onClose={closeModal}
          loading={formLoading}
          isAdmin={session?.user?.role === 'ADMIN'}
        />
      )}
    </div>
  )
}

/**
 * Componente de tarjeta de cliente
 */
function ClientCard({ client, onEdit, onDelete, showBusiness }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Información principal */}
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {client.name}
                </h3>
                {showBusiness && client.business && (
                  <div className="flex items-center gap-1 mt-1">
                    <Building2 className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {client.business.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Información de contacto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {client.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="truncate">{client.email}</span>
                </div>
              )}
              
              {client.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{client.phone}</span>
                </div>
              )}
              
              {client.address && (
                <div className="flex items-center gap-2 text-gray-600 sm:col-span-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="truncate">{client.address}</span>
                </div>
              )}
              
              {client.document && (
                <div className="flex items-center gap-2 text-gray-600">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span>
                    {client.documentType && `${client.documentType}: `}
                    {client.document}
                  </span>
                </div>
              )}
            </div>
            
            {/* Notas */}
            {client.notes && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                <span className="font-medium">Notas: </span>
                {client.notes}
              </div>
            )}
            
            {/* Fecha de creación */}
            <div className="text-xs text-gray-400">
              Creado: {new Date(client.createdAt).toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
          
          {/* Acciones */}
          <div className="flex sm:flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(client)}
              className="flex-1 sm:flex-none"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(client)}
              className="flex-1 sm:flex-none text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Modal de creación/edición de cliente
 */
function ClientModal({ client, formData, setFormData, businesses, onSubmit, onClose, loading, isAdmin }) {
  const isEditing = !!client
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-end z-50">
      <div className="bg-white shadow-xl w-full max-w-md h-full overflow-y-auto animate-in slide-in-from-right duration-300">
        <form onSubmit={onSubmit}>
          {/* Header */}
          <div className="p-6 border-b border-gray-200 relative">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-xl font-semibold text-gray-900 pr-8">
              {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isEditing ? 'Modifica la información del cliente' : 'Completa los datos del nuevo cliente'}
            </p>
          </div>
          
          {/* Formulario */}
          <div className="p-6 space-y-4">
            {/* Nombre (requerido) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nombre completo del cliente"
                required
              />
            </div>
            
            {/* Email y Teléfono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="300 123 4567"
                />
              </div>
            </div>
            
            {/* Documento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Documento
                </label>
                <Select
                  value={formData.documentType}
                  onValueChange={(value) => handleInputChange('documentType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                    <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                    <SelectItem value="NIT">NIT</SelectItem>
                    <SelectItem value="RUT">RUT</SelectItem>
                    <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Documento
                </label>
                <Input
                  value={formData.document}
                  onChange={(e) => handleInputChange('document', e.target.value)}
                  placeholder="123456789"
                />
              </div>
            </div>
            
            {/* Dirección */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <Input
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Calle 123 #45-67, Bogotá"
              />
            </div>
            
            {/* Negocio (solo para admin) */}
            {isAdmin && !isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Negocio
                </label>
                <Select
                  value={formData.businessId}
                  onValueChange={(value) => handleInputChange('businessId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar negocio" />
                  </SelectTrigger>
                  <SelectContent>
                    {businesses.map((business) => (
                      <SelectItem key={business.id} value={business.id}>
                        {business.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Información adicional sobre el cliente..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="w-full sm:w-auto"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Actualizar' : 'Crear'} Cliente
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}