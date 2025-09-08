import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyApiAuth } from "../../../lib/auth-helpers"

const prisma = new PrismaClient()

/**
 * GET /api/test
 * Endpoint de prueba para verificar la conexión a la base de datos
 */
export async function GET() {
  try {
    console.log('🔍 Iniciando test de conexión...')
    
    // Verificar autenticación
    const { session, isAuthenticated } = await verifyApiAuth()
    console.log('🔐 Auth status:', { isAuthenticated, userId: session?.user?.id })
    
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }
    
    // Test básico de conexión a la base de datos
    console.log('📊 Probando conexión a la base de datos...')
    const userCount = await prisma.user.count()
    console.log('👥 Total de usuarios:', userCount)
    
    // Test de consulta de negocios
    console.log('🏢 Probando consulta de negocios...')
    const businessCount = await prisma.business.count()
    console.log('🏢 Total de negocios:', businessCount)
    
    // Test de consulta específica del usuario
    console.log('🔍 Probando consulta del usuario actual...')
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        businessId: true
      }
    })
    console.log('👤 Usuario actual:', currentUser)
    
    return NextResponse.json({
      success: true,
      message: "Test completado exitosamente",
      data: {
        userCount,
        businessCount,
        currentUser,
        session: {
          userId: session.user.id,
          role: session.user.role
        }
      }
    })
    
  } catch (error) {
    console.error('❌ Error en test:', error)
    return NextResponse.json(
      { 
        error: "Error en test",
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}