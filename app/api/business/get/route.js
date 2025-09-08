import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyApiAuth } from "../../../../lib/auth-helpers"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const { session, isAuthenticated } = await verifyApiAuth()
    
    console.log('Get business - Session debug:', {
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

    // Obtener el usuario con su negocio asociado
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        business: {
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
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    if (!user.business) {
      return NextResponse.json({
        hasBusiness: false,
        message: "El usuario no tiene un negocio asociado"
      })
    }

    return NextResponse.json({
      hasBusiness: true,
      business: user.business
    })
  } catch (error) {
    console.error("Error al obtener negocio:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}