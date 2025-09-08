import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyApiAuth } from "../../../../lib/auth-helpers"

const prisma = new PrismaClient()

/**
 * POST /api/business/select
 * Selecciona un negocio como el predeterminado
 */
export async function POST(request) {
  try {
    const { session, isAuthenticated } = await verifyApiAuth()
    
    if (!isAuthenticated || !session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { businessId } = await request.json()
    
    if (!businessId) {
      return NextResponse.json(
        { error: "ID del negocio es requerido" },
        { status: 400 }
      )
    }

    // Verificar que el negocio existe y el usuario tiene acceso
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      return NextResponse.json(
        { error: "Negocio no encontrado" },
        { status: 404 }
      )
    }

    // Para usuarios ADMIN, pueden seleccionar cualquier negocio
    // Para usuarios normales, solo pueden seleccionar su negocio asociado
    if (session.user.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id }
      })
      
      if (user.businessId !== businessId) {
        return NextResponse.json(
          { error: "No tienes permisos para seleccionar este negocio" },
          { status: 403 }
        )
      }
    }

    // Usar transacción para asegurar que solo un negocio esté seleccionado
    await prisma.$transaction(async (tx) => {
      // Primero, desmarcar todos los negocios como no seleccionados
      await tx.business.updateMany({
        data: { isSelected: false }
      })
      
      // Luego, marcar el negocio específico como seleccionado
      await tx.business.update({
        where: { id: businessId },
        data: { isSelected: true }
      })
    })

    return NextResponse.json({
      success: true,
      message: "Negocio seleccionado correctamente"
    })

  } catch (error) {
    console.error('Error selecting business:', error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * GET /api/business/select
 * Obtiene el negocio actualmente seleccionado
 */
export async function GET() {
  try {
    const { session, isAuthenticated } = await verifyApiAuth()
    
    if (!isAuthenticated || !session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    // Buscar el negocio seleccionado
    const selectedBusiness = await prisma.business.findFirst({
      where: { 
        isSelected: true,
        archived: false
      }
    })

    if (!selectedBusiness) {
      // Si no hay ningún negocio seleccionado, intentar seleccionar el primero disponible
      let firstBusiness
      
      if (session.user.role === 'ADMIN') {
        // Para admin, obtener el primer negocio no archivado
        firstBusiness = await prisma.business.findFirst({
          where: { archived: false },
          orderBy: { createdAt: 'asc' }
        })
      } else {
        // Para usuarios normales, obtener su negocio asociado
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          include: { business: true }
        })
        firstBusiness = user?.business
      }

      if (firstBusiness) {
        // Usar transacción para seleccionar automáticamente el primer negocio
        // y asegurar que solo uno esté seleccionado
        await prisma.$transaction(async (tx) => {
          // Desmarcar todos los negocios
          await tx.business.updateMany({
            where: { isSelected: true },
            data: { isSelected: false }
          })
          
          // Seleccionar el primer negocio
          await tx.business.update({
            where: { id: firstBusiness.id },
            data: { isSelected: true }
          })
        })
        
        // Actualizar el objeto firstBusiness con isSelected: true
        firstBusiness.isSelected = true
        
        return NextResponse.json({
          selectedBusiness: firstBusiness,
          autoSelected: true
        })
      }

      return NextResponse.json({
        selectedBusiness: null,
        message: "No hay negocios disponibles"
      })
    }

    return NextResponse.json({
      selectedBusiness,
      autoSelected: false
    })

  } catch (error) {
    console.error('Error getting selected business:', error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}