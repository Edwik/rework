import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyApiAuth } from "../../../../lib/auth-helpers"

const prisma = new PrismaClient()

export async function PUT(request) {
  try {
    const { session, isAuthenticated } = await verifyApiAuth()
    
    if (!isAuthenticated || !session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado - Sesión inválida" },
        { status: 401 }
      )
    }

    const { name, email } = await request.json()

    // Verificar si el email ya existe (excepto el usuario actual)
    if (email !== session.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: "El correo electrónico ya está en uso" },
          { status: 400 }
        )
      }
    }

    // Actualizar el usuario
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        email
      },
      include: {
        business: true
      }
    })

    // Remover la contraseña de la respuesta
    const { password: _, ...userWithoutPassword } = updatedUser

    return NextResponse.json({
      message: "Usuario actualizado exitosamente",
      user: userWithoutPassword
    })
  } catch (error) {
    console.error("Error al actualizar usuario:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}