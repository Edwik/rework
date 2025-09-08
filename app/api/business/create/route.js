import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyApiAuth } from "../../../../lib/auth-helpers"

const prisma = new PrismaClient()

export async function POST(request) {
  try {
    const { session, isAuthenticated } = await verifyApiAuth()
    
    console.log('Create business - Session debug:', {
      hasSession: !!session,
      userId: session?.user?.id,
      businessId: session?.user?.businessId,
      isAuthenticated
    })
    
    if (!isAuthenticated || !session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado - Sesión inválida" },
        { status: 401 }
      )
    }

    // Verificar que el usuario sea ADMIN para crear múltiples negocios
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

    // Solo usuarios ADMIN pueden crear múltiples negocios
    if (user.role !== 'ADMIN' && user.businessId) {
      return NextResponse.json(
        { error: "Los usuarios no ADMIN solo pueden tener un negocio asociado" },
        { status: 400 }
      )
    }

    const { name, description, address, phone, email, website, whatsapp } = await request.json()

    // Validar que al menos el nombre esté presente
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: "El nombre del negocio es requerido" },
        { status: 400 }
      )
    }

    // Validar WhatsApp si se proporciona
    const whatsappValue = whatsapp?.trim() || null
    
    // Solo validar si whatsappValue no es null y no está vacío
    if (whatsappValue && whatsappValue !== '') {
      // Verificar que el WhatsApp no esté ya en uso
      const existingBusiness = await prisma.business.findFirst({
        where: { 
          whatsapp: whatsappValue,
          NOT: {
            whatsapp: null
          }
        }
      })
      
      if (existingBusiness) {
        return NextResponse.json(
          { error: "Este número de WhatsApp ya está registrado en otro negocio" },
          { status: 400 }
        )
      }
    }

    // Preparar los datos del negocio
    const businessData = {
      name: name.trim(),
      description: description?.trim() || null,
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      website: website?.trim() || null
    }

    // Solo incluir whatsapp si tiene un valor válido y no está vacío
    if (whatsappValue && whatsappValue !== '' && whatsappValue !== null) {
      businessData.whatsapp = whatsappValue
    }

    // Crear el negocio con manejo de errores de restricción única
    let newBusiness
    try {
      newBusiness = await prisma.business.create({
        data: businessData
      })
    } catch (error) {
      // Si es un error de restricción única en whatsapp
      if (error.code === 'P2002' && error.meta?.target?.includes('whatsapp')) {
        return NextResponse.json(
          { error: "Este número de WhatsApp ya está registrado en otro negocio. Por favor, usa un número diferente." },
          { status: 400 }
        )
      }
      // Re-lanzar otros errores
      throw error
    }

    // Actualizar el usuario para asociarlo con el negocio
    await prisma.user.update({
      where: { id: session.user.id },
      data: { businessId: newBusiness.id }
    })

    return NextResponse.json({
      message: "Negocio creado exitosamente",
      business: newBusiness
    })
  } catch (error) {
    console.error("Error al crear negocio:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}