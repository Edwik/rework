import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyApiAuth } from "../../../../lib/auth-helpers"

const prisma = new PrismaClient()

/**
 * GET /api/business/[id]
 * Obtiene un negocio específico por ID
 * Solo usuarios ADMIN pueden acceder a cualquier negocio
 */
export async function GET(request, { params }) {
  try {
    const { session, isAuthenticated } = await verifyApiAuth()
    
    console.log('Get business by ID - Session debug:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      businessId: params.id,
      isAuthenticated
    })
    
    if (!isAuthenticated || !session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado - Sesión inválida" },
        { status: 401 }
      )
    }

    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: "ID del negocio es requerido" },
        { status: 400 }
      )
    }

    // Verificar que el usuario sea ADMIN
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, businessId: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Solo usuarios ADMIN pueden acceder a cualquier negocio
    // Usuarios normales solo pueden acceder a su negocio asociado
    if (user.role !== 'ADMIN' && user.businessId !== id) {
      return NextResponse.json(
        { error: "No autorizado - No tienes acceso a este negocio" },
        { status: 403 }
      )
    }

    // Obtener el negocio por ID
    const business = await prisma.business.findUnique({
      where: { id: id }
    })

    if (!business) {
      return NextResponse.json(
        { error: "Negocio no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      business: business
    })

  } catch (error) {
    console.error("Error al obtener negocio por ID:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * PUT /api/business/[id]
 * Actualiza un negocio específico por ID
 * Solo usuarios ADMIN pueden actualizar cualquier negocio
 */
export async function PUT(request, { params }) {
  try {
    const { session, isAuthenticated } = await verifyApiAuth()
    
    console.log('Update business by ID - Session debug:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      businessId: params.id,
      isAuthenticated
    })
    
    if (!isAuthenticated || !session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado - Sesión inválida" },
        { status: 401 }
      )
    }

    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: "ID del negocio es requerido" },
        { status: 400 }
      )
    }

    // Verificar que el usuario sea ADMIN
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, businessId: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Solo usuarios ADMIN pueden actualizar cualquier negocio
    // Usuarios normales solo pueden actualizar su negocio asociado
    if (user.role !== 'ADMIN' && user.businessId !== id) {
      return NextResponse.json(
        { error: "No autorizado - No tienes acceso para actualizar este negocio" },
        { status: 403 }
      )
    }

    const { name, description, address, phone, email, website, whatsapp, archived } = await request.json()

    // Si solo se está archivando/desarchivando, no validar el nombre
    if (archived === undefined && (!name || name.trim() === '')) {
      return NextResponse.json(
        { error: "El nombre del negocio es requerido" },
        { status: 400 }
      )
    }

    // Verificar que el negocio existe
    const existingBusiness = await prisma.business.findUnique({
      where: { id: id }
    })

    if (!existingBusiness) {
      return NextResponse.json(
        { error: "Negocio no encontrado" },
        { status: 404 }
      )
    }

    // Validar WhatsApp si se proporciona y es diferente al actual
    const whatsappValue = whatsapp?.trim() || null
    if (whatsapp !== undefined && whatsappValue && whatsappValue !== existingBusiness.whatsapp) {
      // Verificar que el WhatsApp no esté ya en uso por otro negocio
      const businessWithWhatsapp = await prisma.business.findUnique({
        where: { whatsapp: whatsappValue }
      })
      
      if (businessWithWhatsapp && businessWithWhatsapp.id !== id) {
        return NextResponse.json(
          { error: "Este número de WhatsApp ya está registrado en otro negocio" },
          { status: 400 }
        )
      }
    }

    // Preparar los datos para actualizar
    const updateData = {
      updatedAt: new Date()
    }

    // Solo actualizar campos que no sean undefined
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (address !== undefined) updateData.address = address?.trim() || null
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (email !== undefined) updateData.email = email?.trim() || null
    if (website !== undefined) updateData.website = website?.trim() || null
    if (whatsapp !== undefined) {
      if (whatsappValue) {
        updateData.whatsapp = whatsappValue
      } else {
        // Si whatsapp está vacío, removerlo del negocio
        updateData.whatsapp = null
      }
    }
    if (archived !== undefined) updateData.archived = archived

    // Actualizar el negocio
    const updatedBusiness = await prisma.business.update({
      where: { id: id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: "Negocio actualizado exitosamente",
      business: updatedBusiness
    })

  } catch (error) {
    console.error("Error al actualizar negocio por ID:", error)
    
    // Manejar errores específicos de Prisma
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: "Negocio no encontrado" },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}