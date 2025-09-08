import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyApiAuth } from "../../../../lib/auth-helpers"

const prisma = new PrismaClient()

export async function PUT(request) {
  try {
    const { session, isAuthenticated } = await verifyApiAuth()
    
    console.log('Session debug:', {
      hasSession: !!session,
      userId: session?.user?.id,
      businessId: session?.user?.businessId,
      isAuthenticated
    })
    
    if (!isAuthenticated || !session?.user?.businessId) {
      return NextResponse.json(
        { error: "No autorizado - Sesión inválida o sin negocio asociado" },
        { status: 401 }
      )
    }

    const { name, description, address, phone, email, website, whatsapp } = await request.json()

    // Validar WhatsApp si se proporciona
    const whatsappValue = whatsapp?.trim() || null
    if (whatsappValue) {
      // Verificar que el WhatsApp no esté ya en uso por otro negocio
      const existingBusiness = await prisma.business.findUnique({
        where: { whatsapp: whatsappValue }
      })
      
      if (existingBusiness && existingBusiness.id !== session.user.businessId) {
        return NextResponse.json(
          { error: "Este número de WhatsApp ya está registrado en otro negocio" },
          { status: 400 }
        )
      }
    }

    // Preparar los datos de actualización
    const updateData = {
      name,
      description,
      address,
      phone,
      email,
      website
    }

    // Solo incluir whatsapp si tiene un valor válido
    if (whatsappValue) {
      updateData.whatsapp = whatsappValue
    } else {
      // Si whatsapp está vacío, establecerlo como null
      updateData.whatsapp = null
    }

    // Actualizar el negocio
    const updatedBusiness = await prisma.business.update({
      where: { id: session.user.businessId },
      data: updateData
    })

    return NextResponse.json({
      message: "Negocio actualizado exitosamente",
      business: updatedBusiness
    })
  } catch (error) {
    console.error("Error al actualizar negocio:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}