import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyApiAuth } from "../../../../lib/auth-helpers"

const prisma = new PrismaClient()

/**
 * GET /api/business/list
 * Obtiene todos los negocios asociados a un usuario ADMIN
 * Solo usuarios con rol ADMIN pueden tener múltiples negocios
 */
export async function GET(request) {
  try {
    const { session, isAuthenticated } = await verifyApiAuth()
    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('includeArchived') === 'true'
    
    console.log('List businesses - Session debug:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      isAuthenticated
    })
    
    if (!isAuthenticated || !session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado - Sesión inválida" },
        { status: 401 }
      )
    }

    // Verificar que el usuario sea ADMIN
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "No autorizado - Solo usuarios ADMIN pueden gestionar múltiples negocios" },
        { status: 403 }
      )
    }

    // Obtener todos los negocios donde el usuario es propietario
    // Para esto necesitamos agregar un campo ownerId al modelo Business
    // Por ahora, obtenemos todos los negocios (temporal)
    const whereClause = includeArchived ? {} : { archived: { not: true } }
    
    const businesses = await prisma.business.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        whatsapp: true,
        logo: true,
        archived: true,
        isSelected: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      businesses: businesses,
      count: businesses.length
    })

  } catch (error) {
    console.error("Error al obtener lista de negocios:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}