import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyApiAuth } from "../../../../lib/auth-helpers"

const prisma = new PrismaClient()

/**
 * DELETE /api/business/delete
 * Elimina un negocio específico
 * Solo usuarios ADMIN pueden eliminar negocios
 */
export async function DELETE(request) {
  try {
    const { session, isAuthenticated } = await verifyApiAuth()
    
    console.log('Delete business - Session debug:', {
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
        { error: "No autorizado - Solo usuarios ADMIN pueden eliminar negocios" },
        { status: 403 }
      )
    }

    const { businessId } = await request.json()

    // Validar que se proporcione el ID del negocio
    if (!businessId) {
      return NextResponse.json(
        { error: "ID del negocio es requerido" },
        { status: 400 }
      )
    }

    // Verificar que el negocio existe
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    })
    
    // Verificar si hay usuarios asociados al negocio
    const usersCount = await prisma.user.count({
      where: { businessId: businessId }
    })

    if (!business) {
      return NextResponse.json(
        { error: "Negocio no encontrado" },
        { status: 404 }
      )
    }

    // Verificar si hay usuarios asociados al negocio
    if (usersCount > 0) {
      // Desasociar usuarios del negocio antes de eliminarlo
      await prisma.user.updateMany({
        where: { businessId: businessId },
        data: { businessId: null }
      })
    }

    // Eliminar el negocio
    await prisma.business.delete({
      where: { id: businessId }
    })

    return NextResponse.json({
      success: true,
      message: "Negocio eliminado exitosamente",
      deletedBusinessId: businessId
    })

  } catch (error) {
    console.error("Error al eliminar negocio:", error)
    
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